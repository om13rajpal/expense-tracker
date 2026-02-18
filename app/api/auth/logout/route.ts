/**
 * Logout API Route
 *
 * POST /api/auth/logout
 * Clears the auth-token cookie to end the user's session.
 */
import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders, handleOptions } from '@/lib/middleware';

/**
 * POST /api/auth/logout
 * Clear authentication token
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.json(
    {
      success: true,
      message: 'Logged out successfully',
    },
    { status: 200, headers: corsHeaders() }
  );

  // Clear the auth cookie
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}

/**
 * OPTIONS /api/auth/logout
 */
export async function OPTIONS() {
  return handleOptions();
}
