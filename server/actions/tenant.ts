'use server';

import { prisma } from "@/server/db";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { z } from "zod";

const createBrandSchema = z.object({
    brandName: z.string().min(2, "Brand name must be at least 2 characters"),
});

export async function createBrand(formData: FormData) {
    const user = await currentUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const brandName = formData.get("brandName") as string;

    const validation = createBrandSchema.safeParse({ brandName });
    if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
    }

    // Generate a slug from the name
    const slug = brandName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

    // Ensure slug is unique (simple append for now, robust solution would check DB)
    const uniqueSlug = `${slug}-${Date.now().toString().slice(-4)}`;

    await prisma.$transaction(async (tx) => {
        // 1. Create Tenant
        const tenant = await tx.tenant.create({
            data: {
                name: brandName,
                slug: uniqueSlug,
            }
        });

        // 2. Create/Update User as BRAND_ADMIN
        const existingUser = await tx.user.findUnique({
            where: { clerkId: user.id }
        });

        if (existingUser) {
            await tx.user.update({
                where: { id: existingUser.id },
                data: {
                    role: UserRole.BRAND_ADMIN,
                    tenantId: tenant.id,
                }
            });
        } else {
            await tx.user.create({
                data: {
                    clerkId: user.id,
                    email: user.emailAddresses[0].emailAddress,
                    name: `${user.firstName} ${user.lastName}`.trim() || user.emailAddresses[0].emailAddress,
                    role: UserRole.BRAND_ADMIN,
                    tenantId: tenant.id,
                }
            });
        }
    });

    redirect("/brand/dashboard");
}
