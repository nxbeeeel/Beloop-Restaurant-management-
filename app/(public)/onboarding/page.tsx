import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import OnboardingClient from "./OnboardingClient";
import OnboardingSuccess from "./OnboardingSuccess";
import SignOutWrapper from "./SignOutWrapper";

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
  console.log('--- ONBOARDING DEBUG START ---');
  console.log('Clerk userId:', userId);
  console.log('Clerk Email:', sessionClaims?.email);

  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { clerkId: userId },
        { email: { equals: sessionClaims?.email, mode: 'insensitive' } }
      ]
    }
  });

  console.log('DB Search Result:', user ? `Found User: ${user.id} (${user.role})` : 'User NOT Found');
  console.log('--- ONBOARDING DEBUG END ---');

  // EMERGENCY BACKDOOR: If we know it's Nabeel by email, force the UI to appear
  // This handles cases where Prisma might be acting weird or ID is mismatched
  const isSuperAdminEmail = sessionClaims?.email === 'mnabeelca123@gmail.com';

  if (isSuperAdminEmail && !user) {
    // Fake the user object for the UI if DB failed but Email matched
    user = {
      name: 'Super Admin (Rescue Mode)',
      email: 'mnabeelca123@gmail.com',
      role: 'SUPER',
      id: 'rescue-mode-id'
    } as any;
  }

  // If user exists and has a role, AUTO-FIX them
  if (user && (user.role === 'SUPER' || user.role === 'BRAND_ADMIN' || ((user as any).tenantId && (user as any).outletId))) {
    console.log(`Auto-onboarding user: ${user.email} as ${user.role}`);

    // NOTE: Cookie setting removed - causes production error in Next.js 15
    // Cookie is already set in /api/onboarding route handler
    // (await cookies()).set('onboarding_complete', 'true', {...});

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
          {isSuperAdminEmail && <span className="text-amber-500 font-bold text-xs uppercase tracking-wider">Emergency Access Active</span>}
        </div>

        <div className="flex gap-4">
          <form action={async () => {
            'use server';
            const { redirect } = require('next/navigation');
            // Hardcode checks here again to be safe in the action context
            if (user?.role === 'SUPER' || isSuperAdminEmail) redirect('/super/dashboard');
            if (user?.role === 'BRAND_ADMIN') redirect('/brand/dashboard');
            redirect('/outlet/dashboard');
          }}>
            <button className="px-8 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg hover:shadow-xl transition-all active:scale-95">
              Enter Dashboard 🚀
            </button>
          </form>
        </div>

        <div className="mt-4">
          <SignOutWrapper />
        </div>

        <p className="text-xs text-gray-400 mt-4">System ID: {user.id || 'N/A'} | Clerk: {userId}</p>
      </div>
    );
  }

  // ---------------------------------------------------------
  // CHECK FOR PENDING INVITATIONS
  // ---------------------------------------------------------
  const email = sessionClaims?.email;
  if (email) {
    const invite = await prisma.invitation.findFirst({
      where: {
        email: email,
        status: 'PENDING'
      },
      include: { tenant: true } // Need tenant details to set Redirect URL if needed
    });

    if (invite) {
      console.log(`Found Invite for ${email}. Auto-accepting...`);

      // Upsert User with Invite Role/Tenant
      // We use Upsert to handle both fresh users and existing users without metadata
      const newUser = await prisma.user.upsert({
        where: { clerkId: userId },
        create: {
          clerkId: userId,
          email: email,
          name: sessionClaims?.firstName ? `${sessionClaims.firstName} ${sessionClaims.lastName || ''}` : email.split('@')[0],
          role: invite.inviteRole,
          tenantId: invite.tenantId,
          outletId: invite.outletId,
          isActive: true
        },
        update: {
          role: invite.inviteRole,
          tenantId: invite.tenantId,
          outletId: invite.outletId,
        }
      });

      // Mark Invite as Accepted
      await prisma.invitation.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED' }
      });

      // Sync Clerk Metadata so middleware passes next time
      // Note: We can't easily sync Clerk Metadata from server component without using Clerk API client 
      // but the "Backdoor" logic above (cookie) and middleware DB check might handle it.
      // Ideally we set the cookie here too.

      (await cookies()).set('onboarding_complete', 'true', {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30
      });

      // Redirect based on role
      if (invite.inviteRole === 'BRAND_ADMIN') redirect('/brand/dashboard');
      if (invite.inviteRole === 'OUTLET_MANAGER') redirect('/outlet/dashboard');
      if (invite.inviteRole === 'STAFF') redirect('/outlet/orders'); // or relevant staff page
      redirect('/');
    }
  }

  // ---------------------------------------------------------
  // CHECK FOR PENDING BRAND INVITATIONS (ACID WORKFLOW)
  // ---------------------------------------------------------
  const brandInvite = await prisma.brandInvitation.findFirst({
    where: {
      email: email,
      status: 'PENDING'
    }
  });

  if (brandInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 border border-rose-100">
          <div className="flex items-center gap-3 mb-4 text-rose-600">
            <div className="p-2 bg-rose-50 rounded-full">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <h2 className="text-xl font-bold">Action Required</h2>
          </div>
          <p className="text-stone-600 mb-6">
            You have a pending Brand Setup invitation for <strong>{brandInvite.brandName}</strong>.
            <br /><br />
            Please check your messages for the activation link or contact an administrator.
            <br />
            <span className="text-xs text-stone-400 mt-2 block">Ref: {brandInvite.token.slice(0, 8)}...</span>
          </p>
          <div className="bg-stone-50 p-3 rounded text-xs text-stone-500 border border-stone-200">
            To ensure data integrity, you cannot create a new brand manually while this invitation is pending.
          </div>
          <div className="mt-6">
            <SignOutWrapper />
          </div>
        </div>
      </div>
    );
  }

  // User has no tenant and no invite - allow them to create a brand
  return (
    <div className="relative">
      <OnboardingClient />
    </div>
  );
}
