import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import OnboardingClient from "./OnboardingClient";
import OnboardingSuccess from "./OnboardingSuccess";

import { cookies } from "next/headers";

export default async function OnboardingPage() {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect('/login');
  }

  // Check if user has completed onboarding via Clerk metadata
  if (sessionClaims?.metadata?.onboardingComplete === true) {
    const role = sessionClaims.metadata.role;
    if (role === 'SUPER') redirect('/super/dashboard');
    else if (role === 'BRAND_ADMIN') redirect('/brand/dashboard');
    else redirect('/outlet/dashboard');
  }

  // Double-check database (robust lookup)
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { clerkId: userId },
        { email: { equals: sessionClaims?.email, mode: 'insensitive' } } // Fallback match
      ]
    }
  });

  // If user exists and has a role, AUTO-FIX them
  if (user && (user.role === 'SUPER' || user.role === 'BRAND_ADMIN' || (user.tenantId && user.outletId))) {
    console.log(`Auto-onboarding user: ${user.email} as ${user.role}`);

    // Attempt server-side cookie set
    (await cookies()).set('onboarding_complete', 'true', {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    });

    // Instead of silent redirect, show manual option in case of race condition
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 gap-6">
        <div className="bg-green-100 p-4 rounded-full text-green-600 animate-bounce">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome Back, {user.name}</h1>
        <div className="text-center space-y-2">
          <p className="text-gray-600">We found your account details:</p>
          <code className="bg-gray-100 px-3 py-1 rounded text-sm block">Role: {user.role}</code>
          <code className="bg-gray-100 px-3 py-1 rounded text-sm block">Email: {user.email}</code>
        </div>

        <div className="flex gap-4">
          <form action={async () => {
            'use server';
            const { redirect } = require('next/navigation');
            if (user.role === 'SUPER') redirect('/super/dashboard');
            if (user.role === 'BRAND_ADMIN') redirect('/brand/dashboard');
            redirect('/outlet/dashboard');
          }}>
            <button className="px-8 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg hover:shadow-xl transition-all active:scale-95">
              Enter Dashboard 🚀
            </button>
          </form>
        </div>
        <p className="text-xs text-gray-400 mt-4">System ID: {user.id}</p>
      </div>
    );
  }

  // User has no tenant - allow them to create a brand
  return <OnboardingClient />;
}
