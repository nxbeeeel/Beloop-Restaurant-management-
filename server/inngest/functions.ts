
import { inngest } from "@/lib/inngest";
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Define Event Types
type UserInviteEvent = {
    data: {
        email: string;
        token: string;
        role: string;
        entityName: string;
    }
}

type BrandInviteEvent = {
    data: {
        email: string;
        token: string;
        name: string;
    }
}

// Function 1: Send User Invite (Premium Template)
export const sendInviteEmail = inngest.createFunction(
    { id: "send-user-invite", retries: 3 },
    { event: "mail/user.invite" },
    async ({ event, step }) => {
        const { email, token, role, entityName } = event.data;

        await step.run("send-email", async () => {
            const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;

            const { data, error } = await resend.emails.send({
                from: process.env.EMAIL_FROM_ADDRESS || 'Beloop <noreply@belooprms.app>',
                to: [email],
                subject: `You're invited to ${entityName} 🎉`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="margin: 0; padding: 0; background-color: #0c0a09; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                        <div style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">
                            <!-- Header with gradient -->
                            <div style="background: linear-gradient(135deg, #1c1917 0%, #292524 100%); border: 1px solid #44403c; border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
                                <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); border-radius: 16px; margin: 0 auto 16px; line-height: 64px;">
                                    <span style="font-size: 28px;">✉️</span>
                                </div>
                                <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">You're Invited!</h1>
                                <p style="margin: 8px 0 0; color: #a8a29e; font-size: 16px;">Join the team on Beloop</p>
                            </div>
                            
                            <!-- Content Card -->
                            <div style="background: #1c1917; padding: 32px; border: 1px solid #44403c; border-top: none;">
                                <p style="margin: 0 0 24px; color: #d6d3d1; font-size: 16px; line-height: 1.6;">
                                    <strong style="color: #fafaf9;">${entityName}</strong> has invited you to join as a <strong style="color: #e11d48;">${role}</strong>.
                                </p>
                                
                                <a href="${inviteUrl}" style="display: block; background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; text-align: center; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(225,29,72,0.3);">
                                    Accept Invitation →
                                </a>
                            </div>
                            
                            <!-- Copy Link Section -->
                            <div style="background: #292524; padding: 24px; border: 1px solid #44403c; border-top: none; border-radius: 0 0 16px 16px;">
                                <p style="margin: 0 0 12px; color: #78716c; font-size: 13px; font-weight: 600;">📋 COPY LINK</p>
                                <div style="background: #1c1917; border: 1px solid #44403c; border-radius: 8px; padding: 12px; word-break: break-all;">
                                    <code style="color: #a8a29e; font-size: 12px; font-family: monospace;">${inviteUrl}</code>
                                </div>
                                <p style="margin: 12px 0 0; color: #57534e; font-size: 11px;">
                                    This link expires in 7 days. If the button doesn't work, copy and paste this link in your browser.
                                </p>
                            </div>
                            
                            <!-- Footer -->
                            <p style="text-align: center; color: #57534e; font-size: 12px; margin: 24px 0 0;">
                                © ${new Date().getFullYear()} Beloop · Restaurant Management Made Simple
                            </p>
                        </div>
                    </body>
                    </html>
                `
            });

            if (error) throw error;
            return data;
        });
    }
);

// Function 2: Send Brand Creation Invite (Premium Template)
export const sendBrandInviteEmail = inngest.createFunction(
    { id: "send-brand-invite", retries: 3 },
    { event: "mail/brand.invite" },
    async ({ event, step }) => {
        const { email, token, name } = event.data;

        await step.run("send-email", async () => {
            const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/brand?token=${token}`;

            const { data, error } = await resend.emails.send({
                from: process.env.EMAIL_FROM_ADDRESS || 'Beloop <noreply@belooprms.app>',
                to: [email],
                subject: `🚀 Set up ${name} on Beloop`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="margin: 0; padding: 0; background-color: #0c0a09; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                        <div style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">
                            <!-- Header with gradient -->
                            <div style="background: linear-gradient(135deg, #1c1917 0%, #292524 100%); border: 1px solid #44403c; border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
                                <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); border-radius: 16px; margin: 0 auto 16px; line-height: 64px;">
                                    <span style="font-size: 28px;">🏪</span>
                                </div>
                                <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">Brand Setup</h1>
                                <p style="margin: 8px 0 0; color: #a8a29e; font-size: 16px;">Complete your workspace configuration</p>
                            </div>
                            
                            <!-- Content Card -->
                            <div style="background: #1c1917; padding: 32px; border: 1px solid #44403c; border-top: none;">
                                <h2 style="margin: 0 0 16px; color: #fafaf9; font-size: 20px; font-weight: 600;">Ready to launch <span style="color: #e11d48;">${name}</span>?</h2>
                                <p style="margin: 0 0 24px; color: #a8a29e; font-size: 16px; line-height: 1.6;">
                                    Your brand workspace has been prepared. Click below to configure your settings, add outlets, and invite your team.
                                </p>
                                
                                <a href="${inviteUrl}" style="display: block; background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; text-align: center; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(225,29,72,0.3);">
                                    Initialize Brand →
                                </a>
                            </div>
                            
                            <!-- Copy Link Section -->
                            <div style="background: #292524; padding: 24px; border: 1px solid #44403c; border-top: none; border-radius: 0 0 16px 16px;">
                                <p style="margin: 0 0 12px; color: #78716c; font-size: 13px; font-weight: 600;">📋 COPY LINK</p>
                                <div style="background: #1c1917; border: 1px solid #44403c; border-radius: 8px; padding: 12px; word-break: break-all;">
                                    <code style="color: #a8a29e; font-size: 12px; font-family: monospace;">${inviteUrl}</code>
                                </div>
                                <p style="margin: 12px 0 0; color: #57534e; font-size: 11px;">
                                    🔒 This link is unique to you and expires in 7 days. If the button doesn't work, copy and paste this link in your browser.
                                </p>
                            </div>
                            
                            <!-- Footer -->
                            <p style="text-align: center; color: #57534e; font-size: 12px; margin: 24px 0 0;">
                                © ${new Date().getFullYear()} Beloop · Enterprise Restaurant Management
                            </p>
                        </div>
                    </body>
                    </html>
                `
            });

            if (error) throw error;
            return data;
        });
    }
);

// Function 3: Nightly Aggregation (Cron)
export const nightlyAggregation = inngest.createFunction(
    { id: "nightly-aggregation" },
    { cron: "0 2 * * *" }, // Run at 2 AM UTC daily
    async ({ step }) => {
        const { prisma } = await import("@/lib/prisma"); // Dynamic import
        const { AggregationService } = await import("@/server/services/aggregation.service");

        // 1. Fetch All Tenants
        const tenants = await step.run("fetch-active-tenants", async () => {
            return prisma.tenant.findMany({
                where: { status: 'ACTIVE' },
                select: { id: true }
            });
        });

        // 2. Schedule Aggregation for each (Fan-out)
        for (const tenant of tenants) {
            await step.run(`aggregate-tenant-${tenant.id}`, async () => {
                await AggregationService.refreshToday(tenant.id);
            });
        }

        return { success: true, count: tenants.length };
    }
);

// ==============================================
// POS ASYNC WRITE FUNCTIONS
// ==============================================

/**
 * Event type for POS sale creation
 */
type POSSaleEvent = {
    data: {
        idempotencyKey: string;
        tenantId: string;
        outletId: string;
        userId: string;
        order: {
            items: Array<{
                productId: string;
                name: string;
                quantity: number;
                price: number;
                totalPrice: number;
            }>;
            total: number;
            discount: number;
            paymentMethod: string;
            customerName?: string;
            customerPhone?: string;
            redeemedReward?: boolean;
        };
        timestamp: number;
    }
};

/**
 * Process POS Sale - Async Worker
 * 
 * Decouples POS from direct DB writes. Sales are queued and processed
 * in the background, making POS resilient to Admin API downtime.
 */
export const processSale = inngest.createFunction(
    { id: "pos-process-sale", retries: 5 },
    { event: "pos/sale.created" },
    async ({ event, step }) => {
        const { prisma } = await import("@/lib/prisma");
        const data = event.data as POSSaleEvent['data'];

        console.log(`[ProcessSale] Processing order ${data.idempotencyKey}`);

        // Step 1: Check idempotency using unique idempotencyKey
        const existingOrder = await step.run("check-idempotency", async () => {
            return prisma.order.findUnique({
                where: { idempotencyKey: data.idempotencyKey }
            });
        });

        if (existingOrder) {
            console.log(`[ProcessSale] Order already processed: ${existingOrder.id}`);
            return { skipped: true, orderId: existingOrder.id };
        }

        // Step 2: Create order
        const order = await step.run("create-order", async () => {
            return prisma.$transaction(async (tx) => {
                // Create the order (with idempotencyKey for deduplication)
                const newOrder = await tx.order.create({
                    data: {
                        idempotencyKey: data.idempotencyKey,
                        outletId: data.outletId,
                        tenantId: data.tenantId,
                        status: 'COMPLETED',
                        totalAmount: data.order.total,
                        discount: data.order.discount || 0,
                        tax: 0,
                        paymentMethod: data.order.paymentMethod || 'CASH',
                        customerName: data.order.customerName,
                    },
                });

                // Create order items in bulk (fixes N+1 query)
                await tx.orderItem.createMany({
                    data: data.order.items.map(item => ({
                        orderId: newOrder.id,
                        productId: item.productId,
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        total: item.totalPrice,
                    })),
                });

                return newOrder;
            });
        });

        console.log(`[ProcessSale] Order created: ${order.id}`);

        // Step 3: Deduct stock (skip if service doesn't exist)
        await step.run("deduct-stock", async () => {
            try {
                // Stock deduction logic - update product quantities
                for (const item of data.order.items) {
                    if (item.productId) {
                        await prisma.product.update({
                            where: { id: item.productId },
                            data: {
                                currentStock: {
                                    decrement: item.quantity
                                }
                            }
                        });
                    }
                }
            } catch (error) {
                console.error(`[ProcessSale] Stock deduction failed:`, error);
                // Don't fail the entire order - stock can be reconciled later
            }
        });

        // Step 4: Update daily metrics
        await step.run("update-metrics", async () => {
            try {
                const { AggregationService } = await import("@/server/services/aggregation.service");
                if (data.tenantId) {
                    await AggregationService.refreshToday(data.tenantId);
                }
            } catch (error) {
                console.error(`[ProcessSale] Metrics update failed:`, error);
                // Non-critical - will be caught by nightly aggregation
            }
        });

        return { success: true, orderId: order.id };
    }
);

/**
 * Process Stock Move - Async Worker
 * Note: Simplified to work without idempotencyKey in StockMove table
 */
export const processStockMove = inngest.createFunction(
    { id: "pos-stock-move", retries: 3 },
    { event: "pos/stock.moved" },
    async ({ event, step }) => {
        const { prisma } = await import("@/lib/prisma");
        const data = event.data as {
            idempotencyKey: string;
            outletId: string;
            movements: Array<{
                productId: string;
                quantity: number;
                type: 'STOCK_IN' | 'SALE' | 'WASTAGE' | 'ADJUSTMENT';
                reason: string;
            }>;
        };

        console.log(`[StockMove] Processing ${data.idempotencyKey}`);

        // Process movements
        await step.run("process-movements", async () => {
            for (const move of data.movements) {
                // Create stock move record
                await prisma.stockMove.create({
                    data: {
                        outletId: data.outletId,
                        productId: move.productId,
                        qty: move.quantity,
                        type: move.type as any, // Cast to MoveType enum
                        date: new Date(),
                        notes: move.reason,
                    },
                });

                // Update product stock
                const delta = move.type === 'SALE' || move.type === 'WASTAGE'
                    ? -move.quantity
                    : move.quantity;

                await prisma.product.update({
                    where: { id: move.productId },
                    data: { currentStock: { increment: delta } },
                });
            }
        });

        return { success: true };
    }
);

