import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/server/db';

/**
 * Create Super Admin user in production database
 * Visit: /api/create-super-admin
 */
export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        console.log('[CREATE SUPER] Current user ID:', userId);

        // Check if Super Admin already exists
        const existing = await prisma.user.findFirst({
            where: {
                email: 'mnabeelca123@gmail.com'
            }
        });

        if (existing) {
            // Update existing user
            const updated = await prisma.user.update({
                where: { id: existing.id },
                data: {
                    clerkId: userId,
                    role: 'SUPER',
                    tenantId: null,
                    outletId: null
                }
            });

            console.log('[CREATE SUPER] Updated existing user:', updated.id);

            // Set Clerk metadata
            const client = await clerkClient();
            await client.users.updateUser(userId, {
                publicMetadata: {
                    role: 'SUPER',
                    onboardingComplete: true,
                    userId: updated.id
                }
            });

            return NextResponse.json({
                success: true,
                message: 'Existing user updated to Super Admin',
                action: 'updated',
                user: updated
            });
        }

        // Create new Super Admin user
        const newUser = await prisma.user.create({
            data: {
                clerkId: userId,
                email: 'mnabeelca123@gmail.com',
                name: 'MOHAMMED NABEEL CA',
                role: 'SUPER'
            }
        });

        console.log('[CREATE SUPER] Created new Super Admin:', newUser.id);

        // Set Clerk metadata
        const client = await clerkClient();
        await client.users.updateUser(userId, {
            publicMetadata: {
                role: 'SUPER',
                onboardingComplete: true,
                userId: newUser.id
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Super Admin created successfully! Logout and login again.',
            action: 'created',
            user: newUser
        });

    } catch (error) {
        console.error('[CREATE SUPER] Error:', error);
        return NextResponse.json({
            error: 'Failed to create Super Admin',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
