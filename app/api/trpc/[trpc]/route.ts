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

// OPTIONS handled by middleware

export { handler as GET, handler as POST };
