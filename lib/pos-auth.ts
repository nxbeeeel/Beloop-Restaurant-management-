import { SignJWT, jwtVerify } from 'jose';

/**
 * POS Authentication Service
 * 
 * Uses standard JWT (JOSE) for secure, stateless authentication.
 * Replaces custom HMAC implementation to ensure robust encoding/decoding.
 */

// Use fallback if env var is missing to prevent runtime crashes (and 401s)
const POS_SECRET_VAL = process.env.POS_API_SECRET || 'beloop_fallback_secret_2025_secure_jwt_key';
const POS_SECRET = new TextEncoder().encode(POS_SECRET_VAL);

if (!process.env.POS_API_SECRET) {
    console.warn('[SECURITY WARNING] POS_API_SECRET not set. Using fallback secret. Please set this variable in Vercel.');
}

export interface PosCredentials {
    tenantId: string;
    outletId: string;
    userId: string;
    // JWT standard claims
    iat?: number;
    exp?: number;
    // Compatibility helpers
    timestamp?: number;
    expiresAt?: number;
}

/**
 * Sign POS credentials into a standard JWT
 * Token is valid for 24 hours by default
 */
export async function signPosToken(
    credentials: Omit<PosCredentials, 'timestamp' | 'expiresAt' | 'iat' | 'exp'>,
    expiresIn: string | number = '24h'
): Promise<string> {
    try {
        const alg = 'HS256';
        const jwt = await new SignJWT({
            tenantId: credentials.tenantId,
            outletId: credentials.outletId,
            userId: credentials.userId
        })
            .setProtectedHeader({ alg })
            .setIssuedAt()
            .setExpirationTime(expiresIn)
            .sign(POS_SECRET);

        return jwt;
    } catch (err) {
        console.error('[POS Auth] Sign Error:', err);
        throw new Error('Failed to sign POS token');
    }
}

/**
 * Verify and decode a POS JWT
 * Returns null if token is invalid, expired, or tampered with
 */
export async function verifyPosToken(token: string): Promise<PosCredentials | null> {
    try {
        const { payload } = await jwtVerify(token, POS_SECRET);

        // Map JWT payload to PosCredentials
        return {
            tenantId: payload.tenantId as string,
            outletId: payload.outletId as string,
            userId: payload.userId as string,
            timestamp: payload.iat ? payload.iat * 1000 : Date.now(),
            expiresAt: payload.exp ? payload.exp * 1000 : Date.now() + 86400000,
            iat: payload.iat,
            exp: payload.exp
        };
    } catch (error) {
        // Detailed error logging for debugging
        console.error(`[POS Auth] Verify Failed:`, error);
        return null; // Invalid token
    }
}

/**
 * Token age check (for refresh logic)
 */
export async function getTokenAge(token: string): Promise<number | null> {
    const credentials = await verifyPosToken(token);
    if (!credentials || !credentials.timestamp) return null;
    return Date.now() - credentials.timestamp;
}

/**
 * Check if token needs refresh (within 1 hour of expiry)
 */
export async function shouldRefreshToken(token: string): Promise<boolean> {
    const credentials = await verifyPosToken(token);
    if (!credentials || !credentials.expiresAt) return true;

    const oneHour = 60 * 60 * 1000;
    return (credentials.expiresAt - Date.now()) < oneHour;
}
