
import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/server/db";
import { currentUser, clerkClient } from '@clerk/nextjs/server';
import { ProvisioningService } from "@/server/services/provisioning.service";

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

        // A. Validate Token (Check BrandInvitation first, then generic Invitation)
        let brandInvitation = await tx.brandInvitation.findUnique({
          where: { token: input.token },
        });

        // Fallback: Check generic Invitation (Super Admin pre-provisioned flow)
        let genericInvitation = null;
        if (!brandInvitation) {
          genericInvitation = await tx.invitation.findUnique({
            where: { token: input.token },
            include: { tenant: true }
          });
        }

        if (!brandInvitation && !genericInvitation) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Invalid invitation token" });
        }

        // Common Validations
        const inviteStatus = brandInvitation ? brandInvitation.status : genericInvitation!.status;
        const inviteExpires = brandInvitation ? brandInvitation.expiresAt : genericInvitation!.expiresAt;
        const inviteEmail = brandInvitation ? brandInvitation.email : genericInvitation!.email;
        const inviteBrandName = brandInvitation ? brandInvitation.brandName : genericInvitation!.tenant!.name;

        if (inviteStatus !== "PENDING") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation already used or expired" });
        }

        if (inviteExpires < new Date()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation expired" });
        }

        // B. Secure Email Check
        if (userEmail !== inviteEmail) {
          throw new TRPCError({ code: "FORBIDDEN", message: `This invitation is for ${inviteEmail}, but you are signed in as ${userEmail}.` });
        }

        let tenantId: string;
        let tenantSlug: string;

        // Path A: New Tenant (BrandInvitation)
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
          // Path B: Existing Tenant (genericInvitation)
          tenantId = genericInvitation!.tenantId!;
          const tenant = await tx.tenant.update({
            where: { id: tenantId },
            data: {
              status: 'ACTIVE', // Activate if it was pending
              logoUrl: input.logoUrl, // User can still customize logo
              primaryColor: input.primaryColor || '#e11d48',
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
              role: 'BRAND_ADMIN',
              tenantId: txResult.tenantId,
              onboardingComplete: true
            }
          });
          console.log(`[Activate] Synced Clerk Metadata for ${clerkUserContext.id} -> BRAND_ADMIN`);
        }

      } catch (err) {
        console.error("[Activate] Failed to sync Clerk metadata", err);
        // Don't fail the request, user is created in DB.
      }

      return txResult;
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
              role: appUser.role,
              tenantId: appUser.tenantId,
              outletId: appUser.outletId,
              onboardingComplete: true
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
});
