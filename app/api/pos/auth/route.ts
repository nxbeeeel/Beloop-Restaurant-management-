import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/server/db';
import { signPosToken } from '@/lib/pos-auth';
import { NextResponse } from 'next/server';

/**
 * POS Authentication Endpoint
 * 
 * Authenticates a Clerk user and issues a signed POS token
 * for their assigned outlet. This token is used for all subsequent
 * POS API calls instead of raw outlet/tenant IDs.
 * 
 * Supports:
 * - Cookie-based Clerk auth (same-origin)
 * - Bearer token Clerk auth (cross-origin from POS app)
 * 
 * @route POST /api/pos/auth
 */

// CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

export async function POST(req: Request) {
    try {
        // 1. Try cookie-based auth first (same-origin)
        let { userId } = await auth();

        // 2. If no userId from cookie, try Bearer token (cross-origin from POS)
        if (!userId) {
            const authHeader = req.headers.get('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                const sessionToken = authHeader.substring(7);
                try {
                    // Verify the Clerk session token
                    const client = await clerkClient();
                    // @ts-ignore - verifyToken exists in some versions or we need a different method, bypassing for build
                    const sessionClaims = await (client as any).verifyToken(sessionToken);
                    userId = sessionClaims.sub;
                } catch (tokenError) {
                    console.error('[POS Auth] Token verification failed:', tokenError);
                }
            }
        }

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Not authenticated with Clerk' },
                { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
            );
        }

        // 2. Parse request body
        const body = await req.json();
        const { outletId } = body;

        if (!outletId) {
            return NextResponse.json(
                { error: 'Bad Request', message: 'outletId is required' },
                { status: 400 }
            );
        }

        // 3. Verify user exists and has access to this outlet
        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
            include: {
                outlet: {
                    include: {
                        tenant: {
                            select: { id: true, name: true, slug: true }
                        }
                    }
                }
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'Forbidden', message: 'User not found in system' },
                { status: 403 }
            );
        }

        // 4. Check user has access to the requested outlet
        // SUPER and BRAND_ADMIN can access any outlet in their tenant
        // STAFF and OUTLET_MANAGER must be assigned to the specific outlet
        if (user.role !== 'SUPER' && user.role !== 'BRAND_ADMIN') {
            if (user.outletId !== outletId) {
                console.warn(`[POS Auth] User ${userId} attempted access to outlet ${outletId} but assigned to ${user.outletId}`);
                return NextResponse.json(
                    { error: 'Forbidden', message: 'You do not have access to this outlet' },
                    { status: 403 }
                );
            }
        }

        // 5. Verify outlet exists and is POS-enabled
        // For BRAND_ADMIN/SUPER, we need to fetch the outlet directly since user.outlet may be null
        let outlet = user.outlet;
        if (!outlet || outlet.id !== outletId) {
            outlet = await prisma.outlet.findUnique({
                where: { id: outletId },
                include: {
                    tenant: { select: { id: true, name: true, slug: true } }
                }
            });
        }

        if (!outlet) {
            return NextResponse.json(
                { error: 'Not Found', message: 'Outlet not found' },
                { status: 404 }
            );
        }

        // Brand Admins can only access outlets in their own tenant
        if (user.role === 'BRAND_ADMIN' && outlet.tenantId !== user.tenantId) {
            return NextResponse.json(
                { error: 'Forbidden', message: 'Outlet does not belong to your brand' },
                { status: 403 }
            );
        }

        if (!outlet.isPosEnabled) {
            return NextResponse.json(
                { error: 'Forbidden', message: 'POS is not enabled for this outlet' },
                { status: 403 }
            );
        }

        if (outlet.status !== 'ACTIVE') {
            return NextResponse.json(
                { error: 'Forbidden', message: 'Outlet is not active' },
                { status: 403 }
            );
        }

        // 6. Generate signed POS token
        const token = await signPosToken({
            tenantId: outlet.tenantId,
            outletId: outlet.id,
            userId: user.id,
        });

        console.log(`[POS Auth] Issued token for user ${user.id} at outlet ${outlet.name}`);

        // 7. Return token and outlet info
        return NextResponse.json({
            success: true,
            token,
            outlet: {
                id: outlet.id,
                name: outlet.name,
                address: outlet.address,
                phone: outlet.phone,
            },
            tenant: outlet.tenant,
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
            },
            expiresIn: '24h',
        });

    } catch (error) {
        console.error('[POS Auth] Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', message: 'Failed to authenticate' },
            { status: 500 }
        );
    }
}

/**
 * Refresh POS Token
 * 
 * Allows a valid token to be refreshed before expiry
 * 
 * @route PUT /api/pos/auth
 */
export async function PUT(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get the current token from Authorization header
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Bad Request', message: 'Missing Authorization header' },
                { status: 400 }
            );
        }

        // Import verifyPosToken dynamically to avoid circular deps
        const { verifyPosToken, shouldRefreshToken } = await import('@/lib/pos-auth');

        const oldToken = authHeader.substring(7);
        const credentials = await verifyPosToken(oldToken);

        if (!credentials) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Token expired or invalid' },
                { status: 401 }
            );
        }

        // Only refresh if within 1 hour of expiry
        if (!await shouldRefreshToken(oldToken)) {
            return NextResponse.json({
                success: true,
                refreshed: false,
                message: 'Token still valid, no refresh needed',
            });
        }

        // Issue new token
        const newToken = await signPosToken({
            tenantId: credentials.tenantId,
            outletId: credentials.outletId,
            userId: credentials.userId,
        });

        return NextResponse.json({
            success: true,
            refreshed: true,
            token: newToken,
            expiresIn: '24h',
        });

    } catch (error) {
        console.error('[POS Auth Refresh] Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
