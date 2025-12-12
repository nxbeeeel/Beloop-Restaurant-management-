
import { generateOpenApiDocument } from 'trpc-openapi';
import { appRouter } from '@/server/trpc/routers/_app';
import { NextResponse } from 'next/server';

// Generate OpenAPI document
const openApiDocument = generateOpenApiDocument(appRouter, {
    title: 'Beloop PRMS API',
    version: '1.0.0',
    baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000/api',
});

// Serve as JSON
export const GET = () => {
    return NextResponse.json(openApiDocument);
};
