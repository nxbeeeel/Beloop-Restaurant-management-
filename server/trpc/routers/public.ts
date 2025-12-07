
import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/server/db";

export const publicRouter = router({
    activateBrand: publicProcedure
        .input(z.object({
            token: z.string(),
        }))
        .mutation(async ({ input, ctx }) => {
            // 1. Transactional Atomic Activation
            return await prisma.$transaction(async (tx) => {
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

                // B. Context Validation (User must be logged in via Clerk at this point on client)
                if (!ctx.user) {
                    throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to activate." });
                }

                if (ctx.user.email !== invitation.email) {
                    throw new TRPCError({ code: "FORBIDDEN", message: "This invitation is for a different email address." });
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
                    },
                });

                // D. Link User
                await tx.user.update({
                    where: { id: ctx.user.id },
                    data: {
                        role: "BRAND_ADMIN",
                        tenantId: tenant.id,
                    },
                });

                // E. Consume Token
                await tx.brandInvitation.update({
                    where: { id: invitation.id },
                    data: { status: "USED" },
                });

                return { success: true, tenantId: tenant.id, slug: tenant.slug };
            });
        }),
});
