/**
 * JWT-based authentication utilities for the Finova application.
 *
 * Implements a simple single-user authentication system using environment
 * variable credentials (`AUTH_USERNAME`, `AUTH_PASSWORD`) and JWT tokens
 * (`JWT_SECRET`). Tokens expire after 7 days. In development mode, falls
 * back to default credentials ("admin"/"admin") with a warning.
 *
 * Used by the login API, middleware (`withAuth`), and server-side page
 * authentication (`getAuthUser`, `requireAuth`).
 *
 * @module lib/auth
 */

import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import type { AuthResponse } from './types';

/** Login username from the AUTH_USERNAME environment variable. */
const AUTH_USERNAME = process.env.AUTH_USERNAME;
/** Login password from the AUTH_PASSWORD environment variable. */
const AUTH_PASSWORD = process.env.AUTH_PASSWORD;
/** Secret key used to sign and verify JWT tokens. */
const JWT_SECRET = process.env.JWT_SECRET;

if (!AUTH_USERNAME || !AUTH_PASSWORD || !JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_USERNAME, AUTH_PASSWORD, and JWT_SECRET must be set in production');
  }
  console.warn('Warning: AUTH_USERNAME, AUTH_PASSWORD, or JWT_SECRET not set. Using development defaults.');
}

/** Effective username, falling back to "admin" in development. */
const EFFECTIVE_USERNAME = AUTH_USERNAME || 'admin';
/** Effective password, falling back to "admin" in development. */
const EFFECTIVE_PASSWORD = AUTH_PASSWORD || 'admin';
/** Effective JWT secret, using an insecure default only in development. */
const EFFECTIVE_SECRET = JWT_SECRET || 'dev-only-secret-do-not-use-in-prod';
/** JWT token expiration duration. */
const JWT_EXPIRES_IN = '7d';

/**
 * Authenticated user payload embedded in JWT tokens.
 * Decoded from the token on each authenticated request.
 */
export interface AuthUser {
  /** Unique user identifier. */
  userId: string;
  /** User's email address (matches the AUTH_USERNAME). */
  email: string;
  /** User's display name. */
  name: string;
}

/**
 * Authenticate a user with username and password credentials.
 *
 * Compares the provided credentials against the environment variable values.
 * On success, generates a JWT token with a 7-day expiration containing the
 * user's ID, email, and name.
 *
 * @param username - The login username to validate.
 * @param password - The login password to validate.
 * @returns An `AuthResponse` with success status, JWT token (on success), and user profile.
 */
export async function authenticateUser(username: string, password: string): Promise<AuthResponse> {
  try {
    // Check username and password against environment variables
    if (username.toLowerCase() !== EFFECTIVE_USERNAME.toLowerCase() || password !== EFFECTIVE_PASSWORD) {
      return {
        success: false,
        message: 'Invalid credentials',
      };
    }

    // Create JWT token
    const token = jwt.sign(
      {
        userId: '1',
        email: EFFECTIVE_USERNAME,
        name: 'Om Rajpal',
      },
      EFFECTIVE_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      success: true,
      token,
      message: 'Authentication successful',
      user: {
        id: '1',
        name: 'Om Rajpal',
        email: EFFECTIVE_USERNAME,
      },
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      message: 'Authentication failed',
    };
  }
}

/**
 * Verify and decode a JWT token.
 *
 * @param token - The JWT token string to verify.
 * @returns An object with `valid: true` and the decoded `AuthUser` payload on success,
 *          or `valid: false` if the token is expired, malformed, or has an invalid signature.
 */
export function verifyToken(token: string): { valid: boolean; user?: AuthUser } {
  try {
    const decoded = jwt.verify(token, EFFECTIVE_SECRET) as AuthUser;
    return { valid: true, user: decoded };
  } catch (error) {
    return { valid: false };
  }
}

/**
 * Generate a new JWT token with the given user claims.
 *
 * @param userId - The user's unique identifier.
 * @param email - The user's email address.
 * @param name - The user's display name.
 * @returns A signed JWT token string valid for 7 days.
 */
export function generateToken(userId: string, email: string, name: string): string {
  return jwt.sign({ userId, email, name }, EFFECTIVE_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Retrieve the authenticated user from server-side cookies.
 *
 * Reads the `auth-token` cookie, verifies the JWT, and returns the decoded
 * user payload. Used in server components and server actions to identify
 * the current user without requiring an explicit token parameter.
 *
 * @returns The decoded `AuthUser` if a valid token is present, or `null` if unauthenticated.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, EFFECTIVE_SECRET) as AuthUser;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Require authentication, throwing an error if the user is not logged in.
 *
 * Convenience wrapper around `getAuthUser()` for server actions and API
 * handlers that must always have an authenticated user.
 *
 * @returns The authenticated `AuthUser`.
 * @throws {Error} "Unauthorized" if no valid authentication token is present.
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}
