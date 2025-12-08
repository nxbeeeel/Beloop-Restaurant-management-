import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/server/db';

/**
 * One-time API endpoint to set Super Admin Clerk metadata
 * Call this once after deployment to fix the redirect issue
 * 
 * Usage: GET /api/admin/fix-super-admin
 */
export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();

        // Security: Only allow if user is already authenticated
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Find Super Admin user in database
        const superAdmin = await prisma.user.findFirst({
            where: {
                email: 'mnabeelca123@gmail.com',
                role: 'SUPER'
            }
        });

        if (!superAdmin) {
            return NextResponse.json({ 
                error: 'Super Admin user not found in database' 
            }, { status: 404 });
        }

        console.log('[FIX] Found Super Admin:', {
            id: superAdmin.id,
            email: superAdmin.email,
            role: superAdmin.role,
            clerkId: superAdmin.clerkId
        });

        if (!superAdmin.clerkId) {
            return NextResponse.json({ 
                error: 'Super Admin has no Clerk ID' 
            }, { status: 400 });
        }

        // Update Clerk metadata
        const client = await clerkClient();
        await client.users.updateUser(superAdmin.clerkId, {
            publicMetadata: {
                role: 'SUPER',
                onboardingComplete: true,
                userId: superAdmin.id
            }
        });

        console.log('[FIX] ✅ Clerk metadata updated successfully for Super Admin');

        return NextResponse.json({
            success: true,
            message: 'Super Admin Clerk metadata updated successfully',
            user: {
                id: superAdmin.id,
                email: superAdmin.email,
                role: superAdmin.role,
                clerkId: superAdmin.clerkId
            },
            metadata: {
                role: 'SUPER',
                onboardingComplete: true,
                userId: superAdmin.id
            }
        });
    } catch (error) {
        console.error('[FIX] Error setting Super Admin metadata:', error);
        return NextResponse.json({
            error: 'Failed to update metadata',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
