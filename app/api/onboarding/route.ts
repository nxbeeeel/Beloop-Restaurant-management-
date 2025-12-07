import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/server/db';

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const body = await req.json();
        const { name, slug, logoUrl, primaryColor } = body;

        // Validate required fields
        if (!name || !slug) {
            return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
        }

        // Check if slug is already taken
        const existingTenant = await prisma.tenant.findUnique({
            where: { slug },
        });

        if (existingTenant) {
            return NextResponse.json({ error: 'Brand slug already taken' }, { status: 400 });
        }

        // Create tenant (brand)
        const tenant = await prisma.tenant.create({
            data: {
                name,
                slug,
                logoUrl: logoUrl || null,
                primaryColor: primaryColor || '#e11d48',
                subscriptionStatus: 'TRIAL',
                trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
            },
        });

        // Update or create user with tenant assignment
        const existingUser = await prisma.user.findUnique({
            where: { clerkId: userId },
        });

        if (existingUser) {
            await prisma.user.update({
                where: { clerkId: userId },
                data: {
                    tenantId: tenant.id,
                    role: 'BRAND_ADMIN',
                },
            });
        } else {
            await prisma.user.create({
                data: {
                    clerkId: userId,
                    email: user.emailAddresses[0].emailAddress,
                    name: `${user.firstName} ${user.lastName}`.trim() || user.emailAddresses[0].emailAddress,
                    tenantId: tenant.id,
                    role: 'BRAND_ADMIN',
                },
            });
        }

        // Update Clerk metadata to mark onboarding as complete
        const client = await clerkClient();
        await client.users.updateUser(userId, {
            publicMetadata: {
                onboardingComplete: true,
                role: 'BRAND_ADMIN',
                tenantId: tenant.id,
            },
        });

        const response = NextResponse.json({
            success: true,
            tenant: {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                logoUrl: tenant.logoUrl,
                primaryColor: tenant.primaryColor,
            },
        });

        // Set cookie to allow immediate access to dashboard while Clerk claims refresh
        response.cookies.set('onboarding_complete', 'true', {
            path: '/',
            maxAge: 60 * 60 * 24 * 30, // 30 days
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production'
        });

        return response;
    } catch (error) {
        console.error('Onboarding error:', error);
        return NextResponse.json(
            { error: 'Failed to create brand' },
            { status: 500 }
        );
    }
}

