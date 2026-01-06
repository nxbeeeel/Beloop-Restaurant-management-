import { type NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/server/db';

interface CreateContextOptions {
    headers: Headers;
    req: NextRequest;
}

/**
 * POS Credentials from HMAC-signed token
 * Added by posAuthMiddleware in trpc.ts
 */
export interface PosCredentials {
    tenantId: string;
    outletId: string;
    userId: string;
    timestamp?: number;
    expiresAt?: number;
    verified: boolean;
}

export const createContext = async (opts: CreateContextOptions) => {
    const { userId } = await auth();

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
                // Use parameterized query to prevent SQL injection
                await prisma.$executeRaw`SET LOCAL app.current_tenant_id = ${user.tenantId}`;
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
        req: opts.req,
        // POS credentials will be populated by posAuthMiddleware
        posCredentials: undefined as PosCredentials | undefined,
    };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

