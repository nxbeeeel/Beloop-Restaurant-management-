import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * Force Clerk session refresh
 * This will invalidate the current session and force a new one with updated metadata
 */
export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({
                error: 'Not authenticated',
                instruction: 'Please login first'
            }, { status: 401 });
        }

        // Create response that will clear Clerk session cookies
        const response = NextResponse.json({
            success: true,
            message: 'Session refresh initiated. Please logout and login again.',
            instructions: [
                '1. Click the logout button or visit: https://belooprms.app/sign-out',
                '2. Wait 5 seconds',
                '3. Login again with mnabeelca123@gmail.com',
                '4. You should be redirected to /super/dashboard'
            ],
            technicalDetails: {
                issue: 'Clerk session token cached old metadata (role: NONE)',
                solution: 'Logout/login will fetch fresh session with role: SUPER',
                currentUserId: userId
            }
        });

        // Clear Clerk session cookies to force refresh
        response.cookies.delete('__session');
        response.cookies.delete('__client_uat');

        return response;

    } catch (error) {
        return NextResponse.json({
            error: 'Failed to refresh session',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
