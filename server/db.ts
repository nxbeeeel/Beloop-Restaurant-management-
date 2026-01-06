import { PrismaClient } from '@prisma/client';
import { getRequiredEnv, isProduction, isDevelopment } from '@/lib/env-validation';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

/**
 * Get optimized database URL with connection pooling parameters
 */
function getDatabaseUrl(): string {
    const baseUrl = getRequiredEnv('DATABASE_URL');
    const url = new URL(baseUrl);

    // Serverless-optimized connection pool settings
    if (!url.searchParams.has('connection_limit')) {
        url.searchParams.set('connection_limit', '10'); // Max 10 connections per function
    }
    if (!url.searchParams.has('pool_timeout')) {
        url.searchParams.set('pool_timeout', '20'); // 20 second pool timeout
    }
    if (!url.searchParams.has('connect_timeout')) {
        url.searchParams.set('connect_timeout', '10'); // 10 second connect timeout
    }

    return url.toString();
}

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        datasources: {
            db: {
                url: getDatabaseUrl(),
            },
        },
        log: isDevelopment()
            ? ['query', 'error', 'warn']
            : ['error'],
    });

if (!isProduction()) globalForPrisma.prisma = prisma;
