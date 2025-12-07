
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const EMAIL = 'mnabeelca123@gmail.com';
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || 'sk_test_ALJK6FJQ3krPlBbdBSOAm5BZHovhQn1kxcd2TOWQvh';

async function main() {
    console.log(`🔍 Inspecting Clerk Data for ${EMAIL}...`);

    try {
        const clerkRes = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(EMAIL)}`, {
            headers: { 'Authorization': `Bearer ${CLERK_SECRET_KEY}` }
        });

        if (!clerkRes.ok) {
            console.error('❌ Clerk API Error:', await clerkRes.text());
            return;
        }

        const clerkUsers = await clerkRes.json();
        if (!clerkUsers || clerkUsers.length === 0) {
            console.log('❌ User not found in Clerk.');
            return;
        }

        const u = clerkUsers[0];
        console.log(`CLERK_API_ID=${u.id}`);

        // Check DB
        const dbUser = await prisma.user.findFirst({
            where: { email: { equals: EMAIL, mode: 'insensitive' } }
        });

        if (dbUser) {
            console.log(`DB_STORED_ID=${dbUser.clerkId}`);
            if (u.id !== dbUser.clerkId) {
                console.log('❌ MISMATCH DETECTED! DB has wrong ID.');

                // AUTO-FIX ATTEMPT
                console.log('🛠️ Attempting Auto-Fix...');
                await prisma.user.update({
                    where: { id: dbUser.id },
                    data: { clerkId: u.id }
                });
                console.log('✅ DB Updated with correct Clerk ID.');
            } else {
                console.log('✅ IDs Match.');
            }
        } else {
            console.log('DB User not found.');
        }

        console.log('--- CLERK METADATA ---');
        console.log(JSON.stringify(u.public_metadata, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
