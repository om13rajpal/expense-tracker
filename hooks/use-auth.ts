/**
 * Authentication hook for client-side components.
 * Manages login, logout, and session verification via the `/api/auth/*` endpoints.
 * Persists a JWT token in localStorage alongside HTTP-only cookies.
 * @module hooks/use-auth
 */
'use client';

import { useState, useEffect, useCallback } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  username: string | null;
  error: string | null;
}

interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Provides authentication state and actions (login, logout, checkAuth).
 * Automatically verifies the session on mount.
 * @returns Auth state plus `login`, `logout`, and `checkAuth` callbacks.
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    username: null,
    error: null,
  });

  /**
   * Check if user is authenticated
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
   * Login user
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
   * Logout user
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
