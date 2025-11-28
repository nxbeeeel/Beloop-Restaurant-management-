import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import OnboardingClient from "./OnboardingClient";
import OnboardingSuccess from "./OnboardingSuccess";

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

  // Double-check database
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { role: true, tenantId: true }
  });

  // If user has a tenant but metadata is out of sync
  if (user && user.tenantId) {
    return <OnboardingSuccess />;
  }

  // User has no tenant - allow them to create a brand
  return <OnboardingClient />;
}
