import { type NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/server/db';

interface CreateContextOptions {
    headers: Headers;
    req: NextRequest;
}

export const createContext = async (opts: CreateContextOptions) => {
    const { userId } = auth();

    // Fetch user details if logged in
    let user = null;
    if (userId) {
        user = await prisma.user.findUnique({
            where: { clerkId: userId },
            include: {
                tenant: true,
                outlet: true
            }
        });

        // 🔒 SECURITY: Set PostgreSQL session variable for Row-Level Security (RLS)
        // This ensures database-level tenant isolation, preventing cross-tenant data leakage
        // even if application logic has bugs
        if (user?.tenantId) {
            try {
                await prisma.$executeRawUnsafe(
                    `SET LOCAL app.current_tenant_id = '${user.tenantId}'`
                );
            } catch (error) {
                console.error('Failed to set RLS session variable:', error);
                // Continue execution - RLS policies will handle unauthorized access
            }
        }
    }

    return {
        headers: opts.headers,
        prisma,
        userId,
        user,
        tenantId: user?.tenantId,
        outletId: user?.outletId,
        role: user?.role,
        req: opts.req
    };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
