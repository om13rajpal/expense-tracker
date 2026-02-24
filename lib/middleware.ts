/**
 * Next.js API route middleware for authentication, CORS, and cron authorization.
 *
 * Provides higher-order functions that wrap API route handlers to enforce
 * JWT-based authentication (`withAuth`), CORS preflight handling (`handleOptions`),
 * and cron job secret validation (`withCronAuth`). Also includes utility functions
 * for token extraction and MongoDB ObjectId validation.
 *
 * @module lib/middleware
 */

// Middleware for protecting API routes
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, AuthUser } from './auth';

/**
 * Extract a JWT token from the incoming request.
 *
 * Checks two locations in priority order:
 * 1. `Authorization: Bearer <token>` header
 * 2. `auth-token` cookie
 *
 * @param request - The incoming Next.js API request.
 * @returns The JWT token string, or `null` if no token is found.
 */
export function extractToken(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookies
  const cookieToken = request.cookies.get('auth-token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

/**
 * Authentication middleware wrapper for Next.js API route handlers.
 *
 * Extracts and verifies the JWT token from the request. If valid, calls
 * the wrapped handler with the authenticated user context. If invalid or
 * missing, returns a 401 JSON response with CORS headers.
 *
 * @param handler - The route handler function to protect. Receives the request
 *                  and an object containing the authenticated `AuthUser`.
 * @returns A wrapped handler function that enforces authentication before delegation.
 *
 * @example
 * export const GET = withAuth(async (request, { user }) => {
 *   // user.id, user.name, user.email are available here
 *   return NextResponse.json({ data: ... });
 * });
 */
export function withAuth(
  handler: (request: NextRequest, context: { user: AuthUser }) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const token = extractToken(request);

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401, headers: corsHeaders() }
      );
    }

    const verification = verifyToken(token);

    if (!verification.valid || !verification.user) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401, headers: corsHeaders() }
      );
    }

    // Call the handler with authenticated context
    return handler(request, { user: verification.user });
  };
}

/**
 * Build CORS response headers for API routes.
 *
 * Uses `NEXT_PUBLIC_APP_URL` as the allowed origin, falling back to
 * `http://localhost:3000` in development. Allows credentials for
 * cookie-based authentication.
 *
 * @returns An object of CORS header key-value pairs suitable for NextResponse.
 */
export function corsHeaders() {
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Handle an HTTP OPTIONS preflight request for CORS.
 *
 * Returns a 204 No Content response with the appropriate CORS headers.
 * Should be exported as the `OPTIONS` handler from API route files.
 *
 * @returns A 204 NextResponse with CORS headers.
 *
 * @example
 * // In an API route file:
 * export { handleOptions as OPTIONS } from '@/lib/middleware';
 */
export function handleOptions(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

/**
 * Validate whether a string is a valid MongoDB ObjectId (24 hex characters).
 *
 * @param id - The string to validate.
 * @returns `true` if the string matches the 24-character hexadecimal ObjectId pattern.
 */
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Cron route authorization middleware.
 *
 * Validates the request against the `CRON_SECRET` environment variable.
 * Accepts the secret via two mechanisms:
 * 1. `Authorization: Bearer <secret>` header (used by Vercel Cron)
 * 2. `x-cron-secret` custom header (for manual triggers)
 *
 * Returns a 500 if `CRON_SECRET` is not configured, or a 401 if the
 * provided secret doesn't match.
 *
 * @param handler - The cron route handler to protect.
 * @returns A wrapped handler that validates the cron secret before delegation.
 *
 * @example
 * export const GET = withCronAuth(async (request) => {
 *   // Run the cron job logic
 *   return NextResponse.json({ success: true });
 * });
 */
export function withCronAuth(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      return NextResponse.json(
        { success: false, message: 'CRON_SECRET not configured' },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization');
    const cronHeader = request.headers.get('x-cron-secret');
    const provided = cronHeader || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);

    if (provided !== secret) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    return handler(request);
  };
}
