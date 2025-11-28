'use server';

import { prisma } from "@/server/db";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { z } from "zod";

const createOutletSchema = z.object({
    name: z.string().min(2, "Outlet name must be at least 2 characters"),
    code: z.string().min(2, "Code must be at least 2 characters").max(10, "Code must be at most 10 characters"),
    address: z.string().optional(),
    phone: z.string().optional(),
});

export async function createOutlet(formData: FormData) {
    try {
        const user = await currentUser();
        if (!user) {
            throw new Error("Unauthorized: Please log in");
        }

        // Verify user is BRAND_ADMIN
        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id },
            include: { tenant: true }
        });

        if (!dbUser) {
            throw new Error("User not found in database");
        }

        if (dbUser.role !== 'BRAND_ADMIN') {
            throw new Error("Unauthorized: Only Brand Admins can create outlets");
        }

        if (!dbUser.tenantId) {
            throw new Error("You must create a brand first before adding outlets");
        }

        const rawData = {
            name: formData.get("name") as string,
            code: formData.get("code") as string,
            address: formData.get("address") as string || undefined,
            phone: formData.get("phone") as string || undefined,
        };

        const validation = createOutletSchema.safeParse(rawData);
        if (!validation.success) {
            throw new Error(validation.error.errors[0].message);
        }

        const { name, code, address, phone } = validation.data;

        // Check uniqueness of code within tenant
        const existingOutlet = await prisma.outlet.findUnique({
            where: {
                tenantId_code: {
                    tenantId: dbUser.tenantId,
                    code: code
                }
            }
        });

        if (existingOutlet) {
            throw new Error(`Outlet with code '${code}' already exists`);
        }

        await prisma.outlet.create({
            data: {
                tenantId: dbUser.tenantId,
                name,
                code,
                address: address || null,
                phone: phone || null,
            }
        });

        redirect("/brand/outlets");
    } catch (error) {
        // Log error for debugging
        console.error("Error creating outlet:", error);

        // Re-throw to show user-friendly error
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Failed to create outlet. Please try again.");
    }
}
