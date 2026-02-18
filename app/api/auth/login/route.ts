/**
 * Login API Route
 *
 * POST /api/auth/login
 * Authenticate a user with email/username and password.
 * Sets an HTTP-only auth-token cookie on success (7-day expiry).
 */
import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { corsHeaders, handleOptions } from '@/lib/middleware';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

/**
 * POST /api/auth/login
 * Authenticate user with email and password
 * Only supports hardcoded user: omrajpal@finance.app
 *
 * Request body:
 * {
 *   "email": string,
 *   "password": string
 * }
 *
 * Response:
 * {
 *   "success": boolean,
 *   "message": string,
 *   "token": string (if successful),
 *   "user": object (if successful)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, username } = body;

    // Support both email and username fields for backwards compatibility
    const loginEmail = email || username;

    // Validate input
    if (!loginEmail || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email and password are required',
        },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Authenticate user (MongoDB-based)
    const result = await authenticateUser(loginEmail, password);

    if (!result.success) {
      return NextResponse.json(
        result,
        { status: 401, headers: corsHeaders() }
      );
    }

    // Create response with token in cookie
    const response = NextResponse.json(
      result,
      { status: 200, headers: corsHeaders() }
    );

    // Set HTTP-only cookie with token
    response.cookies.set('auth-token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error: unknown) {
    console.error('Login error:', getErrorMessage(error));
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred during login',
      },
      { status: 500, headers: corsHeaders() }
    );
  }
}

/**
 * OPTIONS /api/auth/login
 * Handle CORS preflight
 */
export async function OPTIONS() {
  return handleOptions();
}
