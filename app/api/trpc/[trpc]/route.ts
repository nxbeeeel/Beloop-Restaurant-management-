import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { NextRequest } from 'next/server';
import { appRouter } from '@/server/trpc/routers/_app';
import { createContext } from '@/server/trpc/context';

const handler = (req: Request) =>
    fetchRequestHandler({
        endpoint: '/api/trpc',
        req,
        router: appRouter,
        createContext: () => createContext({ req: req as unknown as NextRequest, headers: req.headers }),
        onError:
            process.env.NODE_ENV === 'development'
                ? ({ path, error }) => {
                    console.error(
                        `❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`
                    );
                }
                : undefined,
    });

export const OPTIONS = () => {
    return new Response(null, {
        status: 200,
        headers: {
            // Ideally typical CORS setup mirrors the request origin if it matches a whitelist.
            // For now, switching to the Production Subdomain as primary.
            'Access-Control-Allow-Origin': 'https://pos.belooprms.app',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-trpc-source',
            'Access-Control-Allow-Credentials': 'true',
        },
    });
};

export { handler as GET, handler as POST };
