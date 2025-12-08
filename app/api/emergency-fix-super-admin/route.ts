import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/server/db';

/**
 * Emergency fix endpoint - call this once to sync your account
 * Visit: /api/emergency-fix-super-admin
 */
export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        console.log('[EMERGENCY FIX] Starting for user:', userId);

        // Update database with current Clerk ID
        const dbUser = await prisma.user.update({
            where: {
                email: 'mnabeelca123@gmail.com'
            },
            data: {
                clerkId: userId
            },
            select: {
                id: true,
                email: true,
                role: true,
                clerkId: true
            }
        });

        console.log('[EMERGENCY FIX] Database updated:', dbUser);

        // Update Clerk metadata
        const client = await clerkClient();
        await client.users.updateUser(userId, {
            publicMetadata: {
                role: 'SUPER',
                onboardingComplete: true,
                userId: dbUser.id
            }
        });

        console.log('[EMERGENCY FIX] Clerk metadata updated');

        return NextResponse.json({
            success: true,
            message: 'Account fixed! Logout and login again.',
            database: dbUser,
            clerkId: userId
        });

    } catch (error) {
        console.error('[EMERGENCY FIX] Error:', error);
        return NextResponse.json({
            error: 'Failed to fix account',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
