
import { z } from "zod";
import { router, publicProcedure } from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/server/db";
import { currentUser, clerkClient } from '@clerk/nextjs/server';
import { ProvisioningService } from "@/server/services/provisioning.service";
import { generateBypassToken } from "@/lib/tokens"; // ✅ Added import

export const publicRouter = router({
  activateBrand: publicProcedure
    .input(z.object({
      token: z.string(),
      logoUrl: z.string().optional().nullable(),
      primaryColor: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const txResult = await prisma.$transaction(async (tx) => {
        // Fetch Clerk User (Authentic Source of Truth)
        const clerkUser = await currentUser();

        if (!clerkUser) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to activate." });
        }

        const userEmail = clerkUser.emailAddresses[0]?.emailAddress;
        if (!userEmail) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Your account must have an email address." });
        }

        const safeToken = input.token.trim();
        console.log(`[ActivateBrand] Attempting activation with token: ${safeToken}`);

        // A. Validate Token - Check both tables
        const [brandInvitation, genericInvitation] = await Promise.all([
          tx.brandInvitation.findUnique({ where: { token: safeToken } }),
          tx.invitation.findUnique({ where: { token: safeToken }, include: { tenant: true } })
        ]);

        if (!brandInvitation && !genericInvitation) {
          console.error(`[ActivateBrand] Token not found in either table: ${safeToken}`);
          throw new TRPCError({ code: "NOT_FOUND", message: "Invalid invitation token. Please check the link or ask your admin." });
        }

        // Common Validations
        const inviteStatus = brandInvitation ? brandInvitation.status : genericInvitation!.status;
        const inviteExpires = brandInvitation ? brandInvitation.expiresAt : genericInvitation!.expiresAt;
        const inviteEmail = brandInvitation ? brandInvitation.email : genericInvitation!.email;
        // Robust name handling
        const inviteBrandName = brandInvitation
          ? brandInvitation.brandName
          : (genericInvitation?.tenant?.name || (genericInvitation?.metadata as any)?.contactName || "New Brand");

        if (inviteStatus !== "PENDING") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation has already been used." });
        }

        if (inviteExpires < new Date()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation has expired." });
        }

        // B. Secure Email Check
        if (inviteEmail && userEmail !== inviteEmail) {
          // Allow fuzzy match? No, strictly secure.
          // But what if casing differs?
          if (userEmail.toLowerCase() !== inviteEmail.toLowerCase()) {
            throw new TRPCError({ code: "FORBIDDEN", message: `This invitation is for ${inviteEmail}, but you are signed in as ${userEmail}.` });
          }
        }

        let tenantId: string;
        let tenantSlug: string;

        // Path A: New Tenant (BrandInvitation - Self Serve)
        if (brandInvitation) {
          let slug = inviteBrandName.toLowerCase().replace(/[^a-z0-9]/g, '-');
          const existingSlug = await tx.tenant.findUnique({ where: { slug } });
          if (existingSlug) {
            slug = `${slug}-${Date.now().toString().slice(-4)}`;
          }

          const tenant = await tx.tenant.create({
            data: {
              name: inviteBrandName,
              slug: slug,
              status: "ACTIVE",
              pricePerOutlet: 250,
              subscriptionStatus: "TRIAL",
              nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              logoUrl: input.logoUrl,
              primaryColor: input.primaryColor || '#e11d48',
              onboardingStatus: 'COMPLETED', // ✅ Brand Activation = Onboarding Complete
            },
          });
          tenantId = tenant.id;
          tenantSlug = tenant.slug;

          // Consume BrandInvitation
          await tx.brandInvitation.update({
            where: { id: brandInvitation.id },
            data: { status: "USED" },
          });
        } else {
          // Path B: Existing Tenant (genericInvitation - Admin Invite)
          // Ensure tenant exists
          if (!genericInvitation!.tenantId) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Invitation is missing tenant association." });
          }

          tenantId = genericInvitation!.tenantId!;

          // Normalize slug if needed or just use existing
          const tenant = await tx.tenant.update({
            where: { id: tenantId },
            data: {
              status: 'ACTIVE',
              logoUrl: input.logoUrl || undefined, // Only update if provided
              primaryColor: input.primaryColor || undefined,
              onboardingStatus: 'COMPLETED', // ✅ Brand Activation = Onboarding Complete
            }
          });
          tenantSlug = tenant.slug;

          // Consume Generic Invitation
          await tx.invitation.update({
            where: { id: genericInvitation!.id },
            data: { status: "ACCEPTED", acceptedAt: new Date(), acceptedBy: clerkUser.id },
          });
        }

        // D. Atomic User Link/Create
        const existingUser = await tx.user.findUnique({
          where: { email: userEmail }
        });

        if (existingUser) {
          await tx.user.update({
            where: { id: existingUser.id },
            data: {
              role: "BRAND_ADMIN",
              tenantId: tenantId,
              clerkId: clerkUser.id,
              isActive: true,
              name: existingUser.name || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim()
            },
          });
        } else {
          await tx.user.create({
            data: {
              email: userEmail,
              name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Brand Admin',
              clerkId: clerkUser.id,
              role: "BRAND_ADMIN",
              tenantId: tenantId,
              isActive: true,
            }
          });
        }

        return { success: true, tenantId: tenantId, slug: tenantSlug };
      });

      // F. Sync Clerk Metadata (Crucial for Middleware)
      try {
        const client = await clerkClient();
        const clerkUserContext = await currentUser();

        if (clerkUserContext && txResult?.tenantId) {
          await client.users.updateUserMetadata(clerkUserContext.id, {
            publicMetadata: {
              app_role: 'BRAND_ADMIN',
              role: 'BRAND_ADMIN',
              tenantId: txResult.tenantId,
              primary_org_slug: txResult.slug,
              onboardingStatus: 'COMPLETED' // ✅ Single authoritative flag
            }
          });
          console.log(`[Activate] Synced Clerk Metadata for ${clerkUserContext.id} -> BRAND_ADMIN`);
        }

      } catch (err) {
        console.error("[Activate] Failed to sync Clerk metadata", err);
        // Don't fail the request, user is created in DB.
      }

      // D. Generate Bypass Token (Enterprise Fix)
      // Allows immediate access to dashboard even if middleware JWT is stale
      const bypassToken = await generateBypassToken(txResult.tenantId, clerkUserContext?.id || 'unknown');
      const targetSlug = txResult.slug;
      // Force reload to pick up query param
      const redirectUrl = `/brand/${targetSlug}/dashboard?t=${bypassToken}`;

      console.log(`[ActivateBrand] Success! Redirecting with bypass to: ${redirectUrl}`);

      return { ...txResult, redirectUrl };
    }),

  /**
   * Accept User Invitation (Staff/Manager/Existing Brand Admin)
   */
  acceptInvite: publicProcedure
    .input(z.object({
      token: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Fetch Clerk User
      const clerkUser = await currentUser();
      if (!clerkUser) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to accept an invitation." });
      }

      const userEmail = clerkUser.emailAddresses[0]?.emailAddress;
      if (!userEmail) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Your account must have an email address." });
      }

      // Use Atomic Provisioning Service
      try {
        const { user: appUser, invite } = await ProvisioningService.provisionUserFromInvite({
          userId: clerkUser.id,
          email: userEmail,
          name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
          inviteToken: input.token
        });

        // SYNC CLERK METADATA (Outside Transaction to avoid blocking/timeouts/external failures rolling back DB)
        try {
          const client = await clerkClient();
          await client.users.updateUserMetadata(appUser.clerkId, {
            publicMetadata: {
              app_role: appUser.role,
              role: appUser.role,
              tenantId: appUser.tenantId,
              outletId: appUser.outletId,
              onboardingStatus: 'COMPLETED' // ✅ Single authoritative flag
            }
          });
          console.log(`[Public] Synced Clerk Metadata for ${appUser.clerkId} -> ${appUser.role}`);
        } catch (err) {
          console.error("[Public] Failed to sync Clerk metadata (Non-critical)", err);
        }

        return {
          success: true,
          tenantName: invite.tenant?.name,
          role: invite.inviteRole,
          userId: appUser.clerkId,
          meta: {
            role: appUser.role,
            tenantId: appUser.tenantId,
            outletId: appUser.outletId
          }
        };
      } catch (error: any) {
        console.error("Provisioning Error:", error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Failed to provision user."
        });
      }
    }),

  /**
   * Sync User Metadata from DB to Clerk
   * Called from onboarding page to ensure JWT claims are up-to-date
   */
  syncUserMetadata: publicProcedure
    .mutation(async () => {
      const clerkUser = await currentUser();
      if (!clerkUser) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }

      const dbUser = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id },
        include: { tenant: true }
      });

      if (!dbUser) {
        // No DB user yet - that's okay, they're truly unprovisioned
        return { synced: false, reason: "No DB user found" };
      }

      if (!dbUser.role || !dbUser.tenantId) {
        return { synced: false, reason: "User has no role or tenant" };
      }

      // Sync to Clerk
      try {
        const client = await clerkClient();
        await client.users.updateUserMetadata(clerkUser.id, {
          publicMetadata: {
            app_role: dbUser.role,
            role: dbUser.role,
            tenantId: dbUser.tenantId,
            outletId: dbUser.outletId,
            primary_org_slug: dbUser.tenant?.slug,
            onboardingStatus: dbUser.tenant?.onboardingStatus // ✅ Single authoritative flag
          }
        });
        console.log(`[Public] Synced metadata for ${clerkUser.id} -> ${dbUser.role}`);
        return { synced: true, role: dbUser.role };
      } catch (err) {
        console.error("[Public] Failed to sync metadata:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to sync metadata" });
      }
    }),

  /**
   * Get Pending Invitation for Current User
   * Used on onboarding page to show pending invites
   */
  getPendingInvitation: publicProcedure
    .query(async () => {
      const clerkUser = await currentUser();
      if (!clerkUser) {
        return null;
      }

      const email = clerkUser.emailAddresses[0]?.emailAddress;
      if (!email) {
        return null;
      }

      const invite = await prisma.invitation.findFirst({
        where: {
          email: { equals: email, mode: 'insensitive' },
          status: 'PENDING',
          expiresAt: { gt: new Date() }
        },
        include: { tenant: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }
      });

      if (!invite) {
        return null;
      }

      return {
        token: invite.token,
        tenantName: invite.tenant?.name || 'Unknown Brand',
        role: invite.inviteRole
      };
    }),
});
