/**
 * OpenAI Codex OAuth PKCE utilities.
 *
 * Implements the same OAuth flow used by Codex CLI, Roo Code, and OpenClaw:
 * 1. PKCE challenge generation (S256)
 * 2. Authorization URL construction
 * 3. Code → token exchange
 * 4. Token → API key exchange (RFC 8693 token-exchange)
 * 5. Refresh token rotation
 *
 * The public Codex client ID accepts any localhost redirect URI.
 *
 * @module lib/openai-oauth
 */

import { createHash, randomBytes } from 'crypto'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** OpenAI Codex public client ID (same one used by Codex CLI, Roo Code, OpenClaw). */
export const CODEX_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann'

/** OpenAI auth endpoints. */
export const OPENAI_AUTH_URL = 'https://auth.openai.com/oauth/authorize'
export const OPENAI_TOKEN_URL = 'https://auth.openai.com/oauth/token'

/** Device code flow endpoints. */
export const OPENAI_DEVICE_CODE_URL = 'https://auth.openai.com/api/accounts/deviceauth/usercode'
export const OPENAI_DEVICE_TOKEN_URL = 'https://auth.openai.com/api/accounts/deviceauth/token'
export const OPENAI_DEVICE_VERIFICATION_URL = 'https://auth.openai.com/codex/device'
export const OPENAI_DEVICE_CALLBACK_URI = 'https://auth.openai.com/deviceauth/callback'

/** OpenAI API base URL. */
export const OPENAI_API_BASE = 'https://api.openai.com/v1'

/** Default model to use with Codex OAuth keys. */
export const OPENAI_MODEL = 'gpt-4o'

/** OAuth scopes. */
const SCOPES = 'openid profile email offline_access'

// ---------------------------------------------------------------------------
// PKCE helpers
// ---------------------------------------------------------------------------

/** Base64url-encode a buffer (no padding). */
function base64url(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Generate a PKCE code verifier and S256 challenge.
 *
 * @returns Object with `codeVerifier` and `codeChallenge` strings.
 */
export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const verifier = base64url(randomBytes(32))
  const challenge = base64url(createHash('sha256').update(verifier).digest())
  return { codeVerifier: verifier, codeChallenge: challenge }
}

/**
 * Generate a random state value for CSRF protection.
 */
export function generateState(): string {
  return base64url(randomBytes(32))
}

// ---------------------------------------------------------------------------
// Authorization URL
// ---------------------------------------------------------------------------

/**
 * Build the full OpenAI Codex OAuth authorization URL.
 *
 * @param state - CSRF state parameter.
 * @param codeChallenge - PKCE S256 challenge.
 * @param redirectUri - Callback URL (must be a localhost URL).
 * @returns Full authorization URL string.
 */
export function buildAuthorizationUrl(
  state: string,
  codeChallenge: string,
  redirectUri: string
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CODEX_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: SCOPES,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    id_token_add_organizations: 'true',
    codex_cli_simplified_flow: 'true',
    originator: 'finova',
  })
  return `${OPENAI_AUTH_URL}?${params.toString()}`
}

// ---------------------------------------------------------------------------
// Token exchange: code → access_token + id_token + refresh_token
// ---------------------------------------------------------------------------

export interface OAuthTokens {
  accessToken: string
  idToken: string
  refreshToken: string
  expiresIn: number
}

/**
 * Exchange an authorization code for OAuth tokens.
 *
 * @param code - Authorization code from the callback.
 * @param codeVerifier - PKCE code verifier.
 * @param redirectUri - Same redirect URI used in the authorization request.
 * @returns OAuth tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: CODEX_CLIENT_ID,
    code_verifier: codeVerifier,
  })

  const response = await fetch(OPENAI_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Token exchange failed (${response.status}): ${errorText}`)
  }

  const data = await response.json()

  return {
    accessToken: data.access_token,
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in || 3600,
  }
}

// ---------------------------------------------------------------------------
// Token exchange: id_token → OpenAI API key (RFC 8693)
// ---------------------------------------------------------------------------

/**
 * Exchange an OAuth id_token for an OpenAI API key.
 *
 * Uses the RFC 8693 token-exchange grant type.
 *
 * @param idToken - The id_token JWT from the code exchange.
 * @returns The OpenAI API key string.
 */
export async function exchangeTokenForApiKey(idToken: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    subject_token: idToken,
    subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
    requested_token: 'openai-api-key',
    client_id: CODEX_CLIENT_ID,
  })

  const response = await fetch(OPENAI_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API key exchange failed (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  return data.access_token
}

// ---------------------------------------------------------------------------
// Refresh tokens
// ---------------------------------------------------------------------------

/**
 * Refresh OAuth tokens using a refresh_token.
 *
 * @param refreshToken - The stored refresh token.
 * @returns Fresh OAuth tokens (new access_token, id_token, refresh_token).
 */
export async function refreshOAuthTokens(refreshToken: string): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CODEX_CLIENT_ID,
  })

  const response = await fetch(OPENAI_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Token refresh failed (${response.status}): ${errorText}`)
  }

  const data = await response.json()

  return {
    accessToken: data.access_token,
    idToken: data.id_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in || 3600,
  }
}

// ---------------------------------------------------------------------------
// Device Code Flow (RFC 8628)
// ---------------------------------------------------------------------------

export interface DeviceCodeResponse {
  deviceAuthId: string
  userCode: string
  verificationUrl: string
  expiresIn: number
}

/**
 * Step 1: Request a device code from OpenAI.
 *
 * The user must visit the verification URL and enter the user code.
 *
 * @returns Device auth ID, user code, and the URL where the user logs in.
 */
export async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const response = await fetch(OPENAI_DEVICE_CODE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CODEX_CLIENT_ID }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Device code request failed (${response.status}): ${errorText}`)
  }

  const data = await response.json()

  return {
    deviceAuthId: data.device_auth_id,
    userCode: data.user_code,
    verificationUrl: OPENAI_DEVICE_VERIFICATION_URL,
    expiresIn: data.expires_in || 600,
  }
}

export interface DeviceTokenPollResult {
  status: 'pending' | 'authorized' | 'expired'
  authorizationCode?: string
  codeVerifier?: string
}

/**
 * Step 2: Poll for user authorization.
 *
 * Call this repeatedly (every 5s) until the user has entered the code.
 *
 * @param deviceAuthId - The device_auth_id from step 1.
 * @param userCode - The user_code from step 1.
 * @returns Status of the authorization attempt.
 */
export async function pollDeviceToken(
  deviceAuthId: string,
  userCode: string
): Promise<DeviceTokenPollResult> {
  const response = await fetch(OPENAI_DEVICE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      device_auth_id: deviceAuthId,
      user_code: userCode,
    }),
  })

  // 403 = user hasn't authorized yet
  if (response.status === 403) {
    return { status: 'pending' }
  }

  // 410 = expired
  if (response.status === 410) {
    return { status: 'expired' }
  }

  if (!response.ok) {
    const errorText = await response.text()
    // Treat unexpected errors as pending to allow retry
    console.warn(`Device token poll unexpected response (${response.status}): ${errorText}`)
    return { status: 'pending' }
  }

  const data = await response.json()

  return {
    status: 'authorized',
    authorizationCode: data.authorization_code,
    codeVerifier: data.code_verifier,
  }
}

/**
 * Step 3: Exchange the device authorization code for OAuth tokens.
 *
 * Uses the same token endpoint but with the device callback redirect URI.
 *
 * @param authorizationCode - The code from the polling response.
 * @param codeVerifier - The code_verifier from the polling response.
 * @returns OAuth tokens (access_token, id_token, refresh_token).
 */
export async function exchangeDeviceCodeForTokens(
  authorizationCode: string,
  codeVerifier: string
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: OPENAI_DEVICE_CALLBACK_URI,
    client_id: CODEX_CLIENT_ID,
    code_verifier: codeVerifier,
  })

  const response = await fetch(OPENAI_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Device token exchange failed (${response.status}): ${errorText}`)
  }

  const data = await response.json()

  return {
    accessToken: data.access_token,
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in || 3600,
  }
}

// ---------------------------------------------------------------------------
// JWT claims parser (lightweight, no verification)
// ---------------------------------------------------------------------------

/**
 * Decode JWT claims without verification (we trust OpenAI's auth server).
 */
export function parseJWTClaims(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1]
    const decoded = Buffer.from(payload, 'base64url').toString('utf-8')
    return JSON.parse(decoded)
  } catch {
    return {}
  }
}

// ---------------------------------------------------------------------------
// API key validation (for manual key entry fallback)
// ---------------------------------------------------------------------------

/**
 * Validate an OpenAI API key by calling /v1/models.
 */
export async function validateOpenAIKey(
  apiKey: string
): Promise<{ valid: boolean; error?: string; models?: string[] }> {
  if (!apiKey || !apiKey.startsWith('sk-')) {
    return { valid: false, error: 'API key must start with "sk-"' }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    const response = await fetch(`${OPENAI_API_BASE}/models`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      if (response.status === 401) return { valid: false, error: 'Invalid API key' }
      if (response.status === 429) return { valid: false, error: 'Rate limited — try again later' }
      const text = await response.text()
      return { valid: false, error: `OpenAI API error (${response.status}): ${text.slice(0, 200)}` }
    }

    const data = await response.json()
    const modelIds: string[] = Array.isArray(data.data)
      ? data.data.slice(0, 10).map((m: { id: string }) => m.id)
      : []

    return { valid: true, models: modelIds }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { valid: false, error: 'Validation timed out' }
    }
    return { valid: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
