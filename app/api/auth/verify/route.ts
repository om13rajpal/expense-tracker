/**
 * Auth Verification Route
 *
 * GET /api/auth/verify
 * Verifies whether the current JWT token (from cookie or Authorization header) is valid.
 * Returns the authenticated user object on success.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { corsHeaders, handleOptions, extractToken } from '@/lib/middleware';

/**
 * GET /api/auth/verify
 * Verify if the current token is valid
 */
export async function GET(request: NextRequest) {
  const token = extractToken(request);

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        message: 'No token provided',
        authenticated: false,
      },
      { status: 401, headers: corsHeaders() }
    );
  }

  const verification = verifyToken(token);

  if (!verification.valid) {
    return NextResponse.json(
      {
        success: false,
        message: 'Invalid or expired token',
        authenticated: false,
      },
      { status: 401, headers: corsHeaders() }
    );
  }

  return NextResponse.json(
    {
      success: true,
      authenticated: true,
      user: verification.user,
    },
    { status: 200, headers: corsHeaders() }
  );
}

/**
 * OPTIONS /api/auth/verify
 */
export async function OPTIONS() {
  return handleOptions();
}
