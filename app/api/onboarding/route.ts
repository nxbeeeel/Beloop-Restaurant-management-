import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/server/db';
import { Prisma } from '@prisma/client';
import { generateTraceId, logWithTrace } from '@/lib/trace';

export async function POST(req: NextRequest) {
    const traceId = generateTraceId();
    logWithTrace(traceId, 'info', 'Brand creation request received');

    try {
        const { userId } = await auth();

        if (!userId) {
            logWithTrace(traceId, 'error', 'Unauthorized - no userId');
            return NextResponse.json({ error: 'Unauthorized', traceId }, { status: 401 });
        }

        const user = await currentUser();

        if (!user) {
            logWithTrace(traceId, 'error', 'User not found');
            return NextResponse.json({ error: 'User not found', traceId }, { status: 404 });
        }

        const body = await req.json();
        const { name, slug, logoUrl, primaryColor } = body;

        // Validate required fields
        if (!name || !slug) {
            logWithTrace(traceId, 'error', 'Missing required fields', { name: !!name, slug: !!slug });
            return NextResponse.json({ error: 'Name and slug are required', traceId }, { status: 400 });
        }

        // Check for pending BrandInvitation to prevent dual creation
        const pendingInvite = await prisma.brandInvitation.findFirst({
            where: {
                email: user.emailAddresses[0].emailAddress,
                status: 'PENDING'
            }
        });

        if (pendingInvite) {
            logWithTrace(traceId, 'warn', 'User has pending invitation', { brandName: pendingInvite.brandName });
            return NextResponse.json({
                error: `You already have a pending invitation for "${pendingInvite.brandName}". Please use the link provided by the administrator.`,
                traceId
            }, { status: 409 });
        }

        // ========================================
        // PHASE 1: ATOMIC DATABASE TRANSACTION
        // ========================================
        logWithTrace(traceId, 'info', 'Starting database transaction');

        let tenant;
        let dbUser;

        try {
            const result = await prisma.$transaction(async (tx) => {
                // Check if slug already exists (within transaction for consistency)
                const existingTenant = await tx.tenant.findUnique({
                    where: { slug },
                });

                if (existingTenant) {
                    throw new Error('SLUG_EXISTS');
                }

                // Create tenant
                const newTenant = await tx.tenant.create({
                    data: {
                        name,
                        slug,
                        logoUrl: logoUrl || null,
                        primaryColor: primaryColor || '#e11d48',
                        subscriptionStatus: 'TRIAL',
                        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    },
                });

                logWithTrace(traceId, 'info', 'Tenant created', { tenantId: newTenant.id });

                // Update or create user with tenant assignment
                const existingUser = await tx.user.findUnique({
                    where: { clerkId: userId },
                });

                let updatedUser;
                if (existingUser) {
                    updatedUser = await tx.user.update({
                        where: { clerkId: userId },
                        data: {
                            tenantId: newTenant.id,
                            role: 'BRAND_ADMIN',
                        },
                    });
                    logWithTrace(traceId, 'info', 'User updated', { userId: updatedUser.id });
                } else {
                    updatedUser = await tx.user.create({
                        data: {
                            clerkId: userId,
                            email: user.emailAddresses[0].emailAddress,
                            name: `${user.firstName} ${user.lastName}`.trim() || user.emailAddresses[0].emailAddress,
                            tenantId: newTenant.id,
                            role: 'BRAND_ADMIN',
                        },
                    });
                    logWithTrace(traceId, 'info', 'User created', { userId: updatedUser.id });
                }

                return { tenant: newTenant, user: updatedUser };
            });

            tenant = result.tenant;
            dbUser = result.user;

            logWithTrace(traceId, 'info', 'Database transaction committed successfully');
        } catch (dbError) {
            logWithTrace(traceId, 'error', 'Database transaction failed', {
                error: dbError instanceof Error ? dbError.message : 'Unknown error'
            });

            // Check for specific errors
            if (dbError instanceof Error && dbError.message === 'SLUG_EXISTS') {
                return NextResponse.json(
                    { error: 'Brand slug already taken', traceId },
                    { status: 400 }
                );
            }

            if (dbError instanceof Prisma.PrismaClientKnownRequestError) {
                if (dbError.code === 'P2002') {
                    return NextResponse.json(
                        { error: 'Brand slug already exists', traceId },
                        { status: 400 }
                    );
                }
            }

            return NextResponse.json(
                {
                    error: 'Failed to create brand in database',
                    details: dbError instanceof Error ? dbError.message : 'Unknown error',
                    traceId
                },
                { status: 500 }
            );
        }

        // ========================================
        // PHASE 2: CLERK METADATA UPDATE (NON-BLOCKING)
        // ========================================
        logWithTrace(traceId, 'info', 'Updating Clerk metadata');

        try {
            const client = await clerkClient();
            await client.users.updateUser(userId, {
                publicMetadata: {
                    onboardingComplete: true,
                    role: 'BRAND_ADMIN',
                    tenantId: tenant.id,
                },
            });
            logWithTrace(traceId, 'info', 'Clerk metadata updated successfully');
        } catch (clerkError) {
            // Log but don't fail - brand was created successfully
            logWithTrace(traceId, 'warn', 'Clerk metadata update failed (non-fatal)', {
                error: clerkError instanceof Error ? clerkError.message : 'Unknown error'
            });
        }

        // ========================================
        // PHASE 3: RESPONSE WITH COOKIE
        // ========================================
        const response = NextResponse.json({
            success: true,
            traceId,
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

        logWithTrace(traceId, 'info', 'Brand creation completed successfully');
        return response;

    } catch (error) {
        logWithTrace(traceId, 'error', 'Unexpected error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });

        return NextResponse.json(
            {
                error: 'An unexpected error occurred',
                details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
                traceId
            },
            { status: 500 }
        );
    }
}


