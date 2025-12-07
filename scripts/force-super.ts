
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const EMAIL = 'mnabeelca123@gmail.com';
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || 'sk_test_ALJK6FJQ3krPlBbdBSOAm5BZHovhQn1kxcd2TOWQvh';

async function main() {
    console.log(`🔍 Looking up ${EMAIL} in Clerk...`);

    // 1. Fetch User from Clerk
    const clerkRes = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(EMAIL)}`, {
        headers: { 'Authorization': `Bearer ${CLERK_SECRET_KEY}` }
    });

    if (!clerkRes.ok) {
        console.error('❌ Clerk API Error:', await clerkRes.text());
        return;
    }

    const clerkUsers = await clerkRes.json();
    if (!clerkUsers || clerkUsers.length === 0) {
        console.error('❌ User not found in Clerk. Are you sure you signed up?');
        return;
    }

    const clerkUser = clerkUsers[0];
    const clerkId = clerkUser.id;
    console.log(`✅ Found Clerk User: ${clerkId}`);

    // 2. Upsert into Database
    console.log('📝 Upserting into Database...');

    const user = await prisma.user.upsert({
        where: { email: EMAIL },
        update: {
            role: 'SUPER' // Force upgrade if exists
        },
        create: {
            email: EMAIL,
            clerkId: clerkId,
            role: 'SUPER',
            name: clerkUser.first_name ? `${clerkUser.first_name} ${clerkUser.last_name || ''}` : 'Super Admin',
            tenantId: 'cmii7831m0004x2pjj2zokevk', // Assign to existing tenant to satisfy FK
        }
    });

    console.log(`✅ SUCCESS! User ${user.email} is now SUPER.`);
    console.log(`DB ID: ${user.id}`);
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
