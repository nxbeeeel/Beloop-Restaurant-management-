/**
 * TOKEN UTILITY - Enterprise Bypass Pattern
 * 
 * Provides cryptographic utilities for generating and verifying short-lived
 * tokens to bypass auth propagation delays.
 * 
 * Uses Web Crypto API for zero-dependency Edge compatibility.
 */

const SECRET_KEY = process.env.CLERK_SECRET_KEY || 'default-secret-key-do-not-use-in-prod';

export async function generateBypassToken(tenantId: string, userId: string): Promise<string> {
    const payload = JSON.stringify({
        tid: tenantId,
        uid: userId,
        exp: Date.now() + 30 * 1000, // 30 seconds expiry
        purpose: 'ONBOARDING_COMPLETE'
    });

    const signature = await createSignature(payload);

    // ✅ Metrics: Token Generated
    console.log(`[BypassToken] Generated for user ${userId}, tenant ${tenantId}. Expires in 30s.`);

    // Format: payload_base64.signature_base64
    return `${btoa(payload)}.${signature}`;
}

export async function verifyBypassToken(token: string): Promise<{ tenantId: string, userId: string } | null> {
    try {
        const [payloadB64, signature] = token.split('.');
        if (!payloadB64 || !signature) return null;

        const payloadStr = atob(payloadB64);
        const payload = JSON.parse(payloadStr);

        // 1. Check Expiry
        if (Date.now() > payload.exp) {
            console.log('[BypassToken] Token expired');
            return null;
        }

        // 2. Verify Signature
        const expectedSignature = await createSignature(payloadStr);
        if (signature !== expectedSignature) {
            console.log('[BypassToken] Invalid signature');
            return null;
        }

        // ✅ Metrics: Token Verified
        console.log(`[BypassToken] Verified for user ${payload.uid}, tenant ${payload.tid}`);

        return {
            tenantId: payload.tid,
            userId: payload.uid
        };
    } catch (e) {
        console.error('[BypassToken] Verification failed:', e);
        return null;
    }
}

async function createSignature(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(SECRET_KEY);

    const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(data)
    );

    return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
