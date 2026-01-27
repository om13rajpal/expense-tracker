// Authentication utilities
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import type { AuthResponse } from './types';

// Get credentials from environment variables
const AUTH_USERNAME = process.env.AUTH_USERNAME || 'omrajpal';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || '@omisBOSS131313';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
}

/**
 * Authenticate user with username and password (environment variables)
 */
export async function authenticateUser(username: string, password: string): Promise<AuthResponse> {
  try {
    // Check username and password against environment variables
    if (username.toLowerCase() !== AUTH_USERNAME.toLowerCase() || password !== AUTH_PASSWORD) {
      return {
        success: false,
        message: 'Invalid credentials',
      };
    }

    // Create JWT token
    const token = jwt.sign(
      {
        userId: '1',
        email: AUTH_USERNAME,
        name: 'Om Rajpal',
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      success: true,
      token,
      message: 'Authentication successful',
      user: {
        id: '1',
        name: 'Om Rajpal',
        email: AUTH_USERNAME,
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
 * Verify a JWT token
 */
export function verifyToken(token: string): { valid: boolean; user?: AuthUser } {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return { valid: true, user: decoded };
  } catch (error) {
    return { valid: false };
  }
}

/**
 * Generate a new JWT token
 */
export function generateToken(userId: string, email: string, name: string): string {
  return jwt.sign({ userId, email, name }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Get the authenticated user from cookies (server-side)
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}
