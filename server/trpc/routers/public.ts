
import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/server/db";
import { currentUser } from '@clerk/nextjs/server';

export const publicRouter = router({
  activateBrand: publicProcedure
    .input(z.object({
      token: z.string(),
      logoUrl: z.string().optional().nullable(),
      primaryColor: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 1. Transactional Atomic Activation
      return await prisma.$transaction(async (tx) => {
        // Fetch Clerk User (Authentic Source of Truth)
        const clerkUser = await currentUser();

        if (!clerkUser) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to activate." });
        }

        const userEmail = clerkUser.emailAddresses[0]?.emailAddress;
        if (!userEmail) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Your account must have an email address." });
        }

        // A. Validate Token
        const invitation = await tx.brandInvitation.findUnique({
          where: { token: input.token },
        });

        if (!invitation) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Invalid invitation token" });
        }

        if (invitation.status !== "PENDING") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation already used or expired" });
        }

        if (invitation.expiresAt < new Date()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation expired" });
        }

        // B. Secure Email Check
        // Ensure the person clicking the link owns the email it was sent to.
        if (userEmail !== invitation.email) {
          throw new TRPCError({ code: "FORBIDDEN", message: `This invitation is for ${invitation.email}, but you are signed in as ${userEmail}.` });
        }

        // C. Create Tenant
        let slug = invitation.brandName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        // Simple collision handling inside transaction
        const existingSlug = await tx.tenant.findUnique({ where: { slug } });
        if (existingSlug) {
          slug = `${slug}-${Date.now().toString().slice(-4)}`;
        }

        const tenant = await tx.tenant.create({
          data: {
            name: invitation.brandName,
            slug: slug,
            status: "ACTIVE",
            pricePerOutlet: 250, // Default
            subscriptionStatus: "TRIAL", // Trial for new brands
            nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
            logoUrl: input.logoUrl,
            primaryColor: input.primaryColor || '#e11d48',
          },
        });

        // D. Atomic User Link/Create (Zero Dual-Creation)
        // 1. Check for existing user by Email (User could exist from previous invite or just created by Clerk)
        const existingUser = await tx.user.findUnique({
          where: { email: userEmail }
        });

        if (existingUser) {
          // User exists: Link them to new Tenant and ensure Clerk ID is synced
          // If they were already in another tenant, this moves them. (Assuming Brand Admin belongs to one tenant)
          // If they were 'PENDING' user, this activates them.
          await tx.user.update({
            where: { id: existingUser.id },
            data: {
              role: "BRAND_ADMIN",
              tenantId: tenant.id,
              clerkId: clerkUser.id, // Ensure Clerk ID is synced if it was missing
              isActive: true,
              name: existingUser.name || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim()
            },
          });
        } else {
          // User does not exist: Create new User record linked to Tenant
          await tx.user.create({
            data: {
              email: userEmail,
              name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Brand Admin',
              clerkId: clerkUser.id,
              role: "BRAND_ADMIN",
              tenantId: tenant.id,
              isActive: true,
            }
          });
        }

        // E. Consume Token
        await tx.brandInvitation.update({
          where: { id: invitation.id },
          data: { status: "USED" },
        });

        return { success: true, tenantId: tenant.id, slug: tenant.slug };
      });
    }),

  /**
   * Accept User Invitation (Staff/Manager/Existing Brand Admin)
   */
  acceptInvite: publicProcedure
    .input(z.object({
      token: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 1. Transactional Acceptance
      return await prisma.$transaction(async (tx) => {
        // Fetch Clerk User
        const clerkUser = await currentUser();
        if (!clerkUser) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to accept an invitation." });
        }

        const userEmail = clerkUser.emailAddresses[0]?.emailAddress;
        if (!userEmail) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Your account must have an email address." });
        }

        // 2. Validate Token (Table: Invitation)
        const invite = await tx.invitation.findUnique({
          where: { token: input.token },
          include: { tenant: true, outlet: true }
        });

        if (!invite) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Invalid invitation token." });
        }

        if (invite.status !== "PENDING") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation already accepted or expired." });
        }

        if (invite.expiresAt < new Date()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation has expired." });
        }

        // 3. Email Security Check
        if (userEmail !== invite.email) {
          throw new TRPCError({ code: "FORBIDDEN", message: `This invitation is for ${invite.email}, but you are signed in as ${userEmail}.` });
        }

        // 4. Create/Update User Linked to Tenant/Outlet
        const existingUser = await tx.user.findUnique({ where: { email: userEmail } });

        if (existingUser) {
          // Update existing user's role and association
          await tx.user.update({
            where: { id: existingUser.id },
            data: {
              role: invite.inviteRole,
              tenantId: invite.tenantId, // Link to new tenant
              outletId: invite.outletId, // Link to specific outlet if applicable
              clerkId: clerkUser.id,
              isActive: true,
              name: existingUser.name || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim()
            }
          });
        } else {
          // Create new user
          await tx.user.create({
            data: {
              email: userEmail,
              name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Staff Member',
              clerkId: clerkUser.id,
              role: invite.inviteRole,
              tenantId: invite.tenantId,
              outletId: invite.outletId,
              isActive: true,
            }
          });
        }

        // 5. Mark Token Used
        await tx.invitation.update({
          where: { id: invite.id },
          data: { status: "ACCEPTED" }
        });

        return {
          success: true,
          tenantName: invite.tenant?.name,
          role: invite.inviteRole
        };
      });
    }),
});
