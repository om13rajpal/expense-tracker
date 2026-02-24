/**
 * Authentication hook for client-side components.
 * Manages login, logout, and session verification via the `/api/auth/*` endpoints.
 * Persists a JWT token in localStorage alongside HTTP-only cookies.
 * @module hooks/use-auth
 */
'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Represents the current authentication state of the user session.
 * @property isAuthenticated - Whether the user has an active, verified session
 * @property isLoading - True while an auth operation (login, logout, verify) is in progress
 * @property username - The authenticated user's username, or null if not logged in
 * @property error - Human-readable error message from the last failed auth operation, or null
 */
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  username: string | null;
  error: string | null;
}

/**
 * Credentials payload sent to the login endpoint.
 * @property username - The user's login username
 * @property password - The user's plaintext password (transmitted over HTTPS)
 */
interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Provides authentication state and actions (login, logout, checkAuth).
 * Automatically verifies the session on mount by calling `/api/auth/verify`.
 *
 * On successful login, a JWT token is stored in `localStorage` under the key
 * `"auth-token"` for persistence across page reloads. On logout, that token
 * is removed and the server-side session cookie is cleared.
 *
 * @returns An object containing:
 *   - `isAuthenticated` - Whether the user is currently logged in
 *   - `isLoading` - Whether an auth operation is in flight
 *   - `username` - The logged-in user's name, or null
 *   - `error` - The last error message, or null
 *   - `login(credentials)` - Async function to authenticate with username/password
 *   - `logout()` - Async function to end the session and clear tokens
 *   - `checkAuth()` - Async function to re-verify the current session
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    username: null,
    error: null,
  });

  /**
   * Verifies the current session by calling `GET /api/auth/verify`.
   * Updates authentication state based on the server response.
   * Called automatically on hook mount.
   * @returns A promise that resolves when the check completes (no return value)
   */
  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/verify', {
        credentials: 'include',
      });

      const data = await response.json();

      if (data.authenticated) {
        setState({
          isAuthenticated: true,
          isLoading: false,
          username: data.username,
          error: null,
        });
      } else {
        setState({
          isAuthenticated: false,
          isLoading: false,
          username: null,
          error: null,
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState({
        isAuthenticated: false,
        isLoading: false,
        username: null,
        error: message,
      });
    }
  }, []);

  /**
   * Authenticates the user by posting credentials to `POST /api/auth/login`.
   * On success, stores the JWT in localStorage and updates the auth state.
   * @param credentials - The username and password to authenticate with
   * @returns A promise resolving to `{ success: true }` or `{ success: false, error: string }`
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success) {
        // Store token in localStorage for persistence
        if (data.token) {
          localStorage.setItem('auth-token', data.token);
        }

        setState({
          isAuthenticated: true,
          isLoading: false,
          username: credentials.username,
          error: null,
        });

        return { success: true };
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: data.message || 'Login failed',
        }));

        return { success: false, error: data.message };
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
      }));

      return { success: false, error: message };
    }
  }, []);

  /**
   * Ends the current user session by calling `POST /api/auth/logout`.
   * Clears the JWT from localStorage and resets auth state to logged-out.
   * @returns A promise resolving to `{ success: true }` or `{ success: false, error: string }`
   */
  const logout = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      // Clear localStorage
      localStorage.removeItem('auth-token');

      setState({
        isAuthenticated: false,
        isLoading: false,
        username: null,
        error: null,
      });

      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
      }));

      return { success: false, error: message };
    }
  }, []);

  // Check authentication on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkAuth();
  }, [checkAuth]);

  return {
    ...state,
    login,
    logout,
    checkAuth,
  };
}
