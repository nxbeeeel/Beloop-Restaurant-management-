import { createTRPCReact } from '@trpc/react-query';
import { type AppRouter } from '@/server/trpc/routers/_app';

export const trpc = createTRPCReact<AppRouter>();
export const api = trpc; // Alias for velocity module
