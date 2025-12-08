import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/server/db';

/**
 * EMERGENCY diagnostic - bypasses all middleware
 * This endpoint is in /api/admin/* which is public
 */
export async function GET() {
    try {
        const { userId, sessionClaims } = await auth();

        if (!userId) {
            return NextResponse.json({
                error: 'Not authenticated',
                hint: 'Login first, then visit this endpoint'
            }, { status: 401 });
        }

        // Check database
        const dbUser = await prisma.user.findUnique({
            where: { clerkId: userId }
        });

        // Check Clerk
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),

            // Clerk data
            clerk: {
                userId,
                email: clerkUser.emailAddresses[0]?.emailAddress,
                metadata: clerkUser.publicMetadata,
                sessionRole: sessionClaims?.metadata?.role,
                sessionOnboarding: sessionClaims?.metadata?.onboardingComplete
            },

            // Database data
            database: dbUser ? {
                found: true,
                id: dbUser.id,
                email: dbUser.email,
                role: dbUser.role,
                clerkId: dbUser.clerkId
            } : {
                found: false,
                message: 'User not in database - this is the problem!'
            },

            // Diagnosis
            issue: !dbUser ? 'USER_NOT_IN_DATABASE' :
                !clerkUser.publicMetadata?.role ? 'CLERK_METADATA_MISSING' :
                    dbUser.role !== clerkUser.publicMetadata?.role ? 'METADATA_MISMATCH' :
                        'SHOULD_WORK_CHECK_MIDDLEWARE'
        });
    } catch (error) {
        return NextResponse.json({
            error: 'Diagnostic failed',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
