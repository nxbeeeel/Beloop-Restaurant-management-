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

  // NO REDIRECTS HERE - Middleware handles all role-based redirects
  // This page should only be accessible if middleware allows it
  // (i.e., user has no role and no onboarding complete flag)


  console.log('--- ONBOARDING PAGE LOADED ---');
  console.log('User ID:', userId);
  console.log('Session metadata:', sessionClaims?.metadata);

  // Query database for user (needed for page logic)
  const userEmail = sessionClaims?.email as string | undefined;
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { clerkId: userId },
        ...(userEmail ? [{ email: { equals: userEmail, mode: 'insensitive' as const } }] : [])
      ]
    },
    select: {
      id: true,
      email: true,
      role: true,
      tenantId: true,
      outletId: true
    }
  });

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

  // If user exists and has a role, they're already onboarded - redirect them
  if (user && (user.role === 'SUPER' || user.role === 'BRAND_ADMIN' || ((user as any).tenantId && (user as any).outletId))) {
    console.log(`User already onboarded: ${user.email} as ${user.role} - redirecting`);

    // Determine redirect path based on role
    let redirectPath = '/dashboard';
    if (user.role === 'SUPER') {
      redirectPath = '/super/dashboard';
    } else if (user.role === 'BRAND_ADMIN') {
      redirectPath = '/brand/dashboard';
    } else if (user.role === 'OUTLET_MANAGER' || user.role === 'STAFF') {
      redirectPath = '/outlet/dashboard';
    }

    // Automatic redirect
    redirect(redirectPath);
  }

  // ---------------------------------------------------------
  // CHECK FOR PENDING INVITATIONS
  // ---------------------------------------------------------
  const email = userEmail; // Reuse the typed email from above
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

      // Sync Clerk Metadata - handled by middleware DB check
      // Cookie setting removed - causes production error in Next.js 15

      // Redirect based on role
      if (invite.inviteRole === 'BRAND_ADMIN') redirect('/brand/dashboard');
      if (invite.inviteRole === 'OUTLET_MANAGER') redirect('/outlet/dashboard');
      if (invite.inviteRole === 'STAFF') redirect('/outlet/orders');
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
