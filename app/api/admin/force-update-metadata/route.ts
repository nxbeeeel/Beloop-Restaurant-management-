import { NextResponse } from 'next/server';
<parameter name="auth" >import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/server/db';

/**
 * FORCE update Clerk metadata for current user
 * This will set the metadata directly via Clerk API
 */
export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({
                error: 'Not authenticated'
            }, { status: 401 });
        }

        console.log('[FORCE UPDATE] Starting for user:', userId);

        // Get user from database
        const dbUser = await prisma.user.findUnique({
            where: { clerkId: userId },
            select: {
                id: true,
                email: true,
                role: true,
                tenantId: true,
                outletId: true
            }
        });

        if (!dbUser) {
            return NextResponse.json({
                error: 'User not found in database',
                userId
            }, { status: 404 });
        }

        console.log('[FORCE UPDATE] Database user:', dbUser);

        // Force update Clerk metadata
        const client = await clerkClient();
        const updatedUser = await client.users.updateUser(userId, {
            publicMetadata: {
                role: dbUser.role,
                onboardingComplete: true,
                userId: dbUser.id,
                ...(dbUser.tenantId && { tenantId: dbUser.tenantId }),
                ...(dbUser.outletId && { outletId: dbUser.outletId })
            }
        });

        console.log('[FORCE UPDATE] Clerk metadata updated:', updatedUser.publicMetadata);

        return NextResponse.json({
            success: true,
            message: 'Clerk metadata force updated! Now logout and login again.',
            database: dbUser,
            clerkMetadata: updatedUser.publicMetadata,
            instructions: [
                '1. Logout completely (visit /sign-out)',
                '2. Wait 10 seconds',
                '3. Clear browser cache (Ctrl+Shift+Delete)',
                '4. Login again',
                '5. Should redirect to /super/dashboard'
            ]
        });

    } catch (error) {
        console.error('[FORCE UPDATE] Error:', error);
        return NextResponse.json({
            error: 'Failed to update metadata',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
