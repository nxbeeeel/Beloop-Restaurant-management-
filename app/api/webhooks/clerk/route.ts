import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { prisma } from '@/server/db'

export async function POST(req: Request) {
    // You can find this in the Clerk Dashboard -> Webhooks -> choose the endpoint
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

    if (!WEBHOOK_SECRET) {
        throw new Error('Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
    }

    // Get the headers
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response('Error occured -- no svix headers', {
            status: 400
        })
    }

    // Get the body
    const payload = await req.json()
    const body = JSON.stringify(payload);

    // Create a new Svix instance with your secret.
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: WebhookEvent

    // Verify the payload with the headers
    try {
        evt = wh.verify(body, {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        }) as WebhookEvent
    } catch (err) {
        console.error('Error verifying webhook:', err);
        return new Response('Error occured', {
            status: 400
        })
    }

    // Do something with the payload
    // For this guide, you simply log the payload to the console
    const eventType = evt.type;

    if (eventType === 'user.created' || eventType === 'user.updated') {
        const { id, email_addresses, first_name, last_name } = evt.data;
        const email = email_addresses[0]?.email_address;
        const name = `${first_name || ''} ${last_name || ''}`.trim() || email;

        if (email) {
            // STRUCTURAL FIX: Enforce one email = one user
            // Check if user exists by EMAIL first (not just Clerk ID)
            const existingUserByEmail = await prisma.user.findUnique({
                where: { email: email.toLowerCase() },
                select: { id: true, clerkId: true, role: true }
            });

            let dbUser;

            if (existingUserByEmail && existingUserByEmail.clerkId !== id) {
                // User recreated their Clerk account - update existing record
                console.log(`[WEBHOOK] User recreated Clerk account. Updating existing user ${existingUserByEmail.id}`);
                console.log(`[WEBHOOK] Old Clerk ID: ${existingUserByEmail.clerkId}, New Clerk ID: ${id}`);

                dbUser = await prisma.user.update({
                    where: { id: existingUserByEmail.id },
                    data: {
                        clerkId: id,
                        name,
                    },
                    select: {
                        id: true,
                        role: true,
                        tenantId: true,
                        outletId: true
                    }
                });
            } else {
                // Normal upsert by Clerk ID
                dbUser = await prisma.user.upsert({
                    where: { clerkId: id },
                    update: {
                        email: email.toLowerCase(),
                        name,
                    },
                    create: {
                        clerkId: id,
                        email: email.toLowerCase(),
                        name,
                        role: 'STAFF', // Default role, will be updated by invitation or admin
                    },
                    select: {
                        id: true,
                        role: true,
                        tenantId: true,
                        outletId: true
                    }
                });
            }

            // STRUCTURAL FIX: Sync database role to Clerk metadata
            // This ensures Clerk metadata is always in sync with database
            try {
                const { clerkClient } = await import('@clerk/nextjs/server');
                const client = await clerkClient();

                await client.users.updateUser(id, {
                    publicMetadata: {
                        role: dbUser.role,
                        onboardingComplete: dbUser.role === 'SUPER' || (dbUser.tenantId !== null),
                        userId: dbUser.id,
                        ...(dbUser.tenantId && { tenantId: dbUser.tenantId }),
                        ...(dbUser.outletId && { outletId: dbUser.outletId })
                    }
                });

                console.log(`[WEBHOOK] Synced metadata for user ${id}: role=${dbUser.role}`);
            } catch (clerkError) {
                console.error(`[WEBHOOK] Failed to sync metadata for user ${id}:`, clerkError);
            }
        }
    }


    if (eventType === 'user.deleted') {
        const { id } = evt.data;
        if (id) {
            // We might want to soft delete or just remove the clerkId linkage
            // For now, let's keep the record but maybe mark it? 
            // Or actually delete it if that's the policy. 
            // Given "GDPR forget" requirement, we might want a hard delete here or soft delete.
            // Let's just log for now as deleting data via webhook can be risky without checks.
            console.log(`User deleted in Clerk: ${id}`);
        }
    }

    return new Response('', { status: 200 })
}
