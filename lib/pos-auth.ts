import { createHmac } from 'crypto';

/**
 * POS Authentication Service
 * 
 * Provides HMAC-signed tokens for secure POS API communication.
 * Eliminates header spoofing vulnerability by cryptographically signing
 * the tenant/outlet context.
 */

const POS_SECRET = process.env.POS_API_SECRET;

if (!POS_SECRET && process.env.NODE_ENV === 'production') {
    console.warn('[SECURITY] POS_API_SECRET is not set! POS authentication will fail.');
}

export interface PosCredentials {
    tenantId: string;
    outletId: string;
    userId: string;
    timestamp: number;
    expiresAt: number;
}

/**
 * Sign POS credentials into a secure token
 * Token is valid for 24 hours by default
 */
export function signPosToken(
    credentials: Omit<PosCredentials, 'timestamp' | 'expiresAt'>,
    expiresInMs: number = 24 * 60 * 60 * 1000 // 24 hours
): string {
    if (!POS_SECRET) {
        throw new Error('POS_API_SECRET is not configured');
    }

    const fullCredentials: PosCredentials = {
        ...credentials,
        timestamp: Date.now(),
        expiresAt: Date.now() + expiresInMs,
    };

    const payload = JSON.stringify(fullCredentials);
    const signature = createHmac('sha256', POS_SECRET)
        .update(payload)
        .digest('hex');

    return Buffer.from(
        JSON.stringify({ payload, signature })
    ).toString('base64');
}

/**
 * Verify and decode a POS token
 * Returns null if token is invalid, expired, or tampered with
 */
export function verifyPosToken(token: string): PosCredentials | null {
    if (!POS_SECRET) {
        console.error('[POS Auth] POS_API_SECRET not configured');
        return null;
    }

    try {
        const decoded = JSON.parse(
            Buffer.from(token, 'base64').toString('utf8')
        );

        const { payload, signature } = decoded;

        // Verify signature
        const expectedSignature = createHmac('sha256', POS_SECRET)
            .update(payload)
            .digest('hex');

        if (signature !== expectedSignature) {
            console.warn('[POS Auth] Invalid signature - possible tampering');
            return null;
        }

        const credentials: PosCredentials = JSON.parse(payload);

        // Check expiration
        if (Date.now() > credentials.expiresAt) {
            console.warn('[POS Auth] Token expired');
            return null;
        }

        return credentials;
    } catch (error) {
        console.error('[POS Auth] Token verification failed:', error);
        return null;
    }
}

/**
 * Token age check (for refresh logic)
 */
export function getTokenAge(token: string): number | null {
    const credentials = verifyPosToken(token);
    if (!credentials) return null;
    return Date.now() - credentials.timestamp;
}

/**
 * Check if token needs refresh (within 1 hour of expiry)
 */
export function shouldRefreshToken(token: string): boolean {
    const credentials = verifyPosToken(token);
    if (!credentials) return true;

    const oneHour = 60 * 60 * 1000;
    return (credentials.expiresAt - Date.now()) < oneHour;
}
