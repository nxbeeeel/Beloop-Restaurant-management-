import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/server/db';

/**
 * Complete diagnostic endpoint - shows EVERYTHING
 */
export async function GET() {
    try {
        const { userId, sessionClaims } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // 1. Check database
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

        // 2. Check Clerk metadata
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            clerk: {
                userId: userId,
                email: clerkUser.emailAddresses[0]?.emailAddress,
                publicMetadata: clerkUser.publicMetadata,
                sessionClaims: sessionClaims
            },
            database: dbUser ? {
                found: true,
                id: dbUser.id,
                email: dbUser.email,
                role: dbUser.role,
                clerkId: dbUser.clerkId,
                tenantId: dbUser.tenantId,
                outletId: dbUser.outletId
            } : {
                found: false
            },
            diagnosis: {
                hasClerkMetadata: !!clerkUser.publicMetadata?.role,
                clerkRole: clerkUser.publicMetadata?.role || null,
                dbRole: dbUser?.role || null,
                metadataMatches: dbUser?.role === clerkUser.publicMetadata?.role,
                onboardingComplete: clerkUser.publicMetadata?.onboardingComplete || false,
                expectedRoute: dbUser?.role === 'SUPER' ? '/super/dashboard' : '/onboarding',
                issue: !dbUser ? 'User not in database' :
                    !clerkUser.publicMetadata?.role ? 'Clerk metadata missing' :
                        dbUser.role !== clerkUser.publicMetadata?.role ? 'Metadata mismatch' :
                            'Should work - check middleware logs'
            }
        });
    } catch (error) {
        return NextResponse.json({
            error: 'Diagnostic failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
