import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/server/db';

/**
 * Diagnostic endpoint to check Super Admin status
 * Visit: /api/debug/super-admin-status
 */
export async function GET() {
    try {
        const { userId, sessionClaims } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Check database
        const dbUser = await prisma.user.findUnique({
            where: { clerkId: userId },
            select: {
                id: true,
                email: true,
                role: true,
                clerkId: true,
                tenantId: true,
                outletId: true
            }
        });

        // Check Clerk metadata
        const clerkMetadata = sessionClaims?.metadata;

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            userId,
            database: {
                found: !!dbUser,
                role: dbUser?.role,
                email: dbUser?.email,
                tenantId: dbUser?.tenantId,
                outletId: dbUser?.outletId
            },
            clerk: {
                metadata: clerkMetadata,
                role: clerkMetadata?.role,
                onboardingComplete: clerkMetadata?.onboardingComplete
            },
            diagnosis: {
                isSuper: dbUser?.role === 'SUPER',
                hasClerkMetadata: !!clerkMetadata?.role,
                metadataMatches: dbUser?.role === clerkMetadata?.role,
                shouldRedirect: dbUser?.role === 'SUPER',
                expectedRoute: dbUser?.role === 'SUPER' ? '/super/dashboard' : '/onboarding'
            }
        });
    } catch (error) {
        return NextResponse.json({
            error: 'Failed to check status',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
