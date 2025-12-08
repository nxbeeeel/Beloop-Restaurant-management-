import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/server/db';

export async function POST(req: NextRequest) {
    console.log('[API /api/onboarding] POST request received');
    try {
        const { userId } = await auth();
        console.log('[API /api/onboarding] userId:', userId);
        
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await currentUser();
        console.log('[API /api/onboarding] currentUser:', user?.emailAddresses[0]?.emailAddress);
        
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const body = await req.json();
        console.log('[API /api/onboarding] Request body:', { name: body.name, slug: body.slug });
        
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

        // Check for pending BrandInvitation to prevent dual creation
        const pendingInvite = await prisma.brandInvitation.findFirst({
            where: {
                email: user.emailAddresses[0].emailAddress,
                status: 'PENDING'
            }
        });

        if (pendingInvite) {
            return NextResponse.json({
                error: `You already have a pending invitation for "${pendingInvite.brandName}". Please use the link provided by the administrator.`
            }, { status: 409 });
        }

        // Create tenant (brand) and user in a transaction
        let tenant;
        try {
            tenant = await prisma.$transaction(async (tx) => {
                // Create tenant
                const newTenant = await tx.tenant.create({
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
                const existingUser = await tx.user.findUnique({
                    where: { clerkId: userId },
                });

                if (existingUser) {
                    await tx.user.update({
                        where: { clerkId: userId },
                        data: {
                            tenantId: newTenant.id,
                            role: 'BRAND_ADMIN',
                        },
                    });
                } else {
                    await tx.user.create({
                        data: {
                            clerkId: userId,
                            email: user.emailAddresses[0].emailAddress,
                            name: `${user.firstName} ${user.lastName}`.trim() || user.emailAddresses[0].emailAddress,
                            tenantId: newTenant.id,
                            role: 'BRAND_ADMIN',
                        },
                    });
                }

                return newTenant;
            });

            console.log('[API /api/onboarding] Database transaction successful, tenant created:', tenant.id);
        } catch (dbError) {
            console.error('[API /api/onboarding] Database transaction failed:', dbError);
            return NextResponse.json(
                { error: 'Failed to create brand in database', details: dbError instanceof Error ? dbError.message : 'Unknown error' },
                { status: 500 }
            );
        }

        // Update Clerk metadata (separate from DB transaction to avoid rollback issues)
        try {
            const client = await clerkClient();
            await client.users.updateUser(userId, {
                publicMetadata: {
                    onboardingComplete: true,
                    role: 'BRAND_ADMIN',
                    tenantId: tenant.id,
                },
            });
            console.log('[API /api/onboarding] Clerk metadata updated successfully');
        } catch (clerkError) {
            console.error('[API /api/onboarding] Clerk metadata update failed (brand still created):', clerkError);
            // Don't fail the request - brand was created successfully
            // The cookie will allow access even if Clerk metadata fails
        }

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

        console.log('[API /api/onboarding] Brand creation completed successfully');
        return response;
    } catch (error) {
        console.error('[API /api/onboarding] Unexpected error:', error);
        console.error('[API /api/onboarding] Error stack:', error instanceof Error ? error.stack : 'No stack');
        
        return NextResponse.json(
            { 
                error: 'An unexpected error occurred', 
                details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined 
            },
            { status: 500 }
        );
    }
}

