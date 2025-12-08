import { NextResponse } from 'next/server';

/**
 * Test endpoint to verify deployment version
 * Returns the latest commit info and deployment timestamp
 */
export async function GET() {
    return NextResponse.json({
        deployed: true,
        version: '30098da',
        feature: 'Database-first Super Admin check',
        timestamp: new Date().toISOString(),
        message: 'If you see this, the latest code is deployed'
    });
}
