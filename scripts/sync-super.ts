
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const EMAIL = 'mnabeelca123@gmail.com';
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || 'sk_test_ALJK6FJQ3krPlBbdBSOAm5BZHovhQn1kxcd2TOWQvh';

async function main() {
    console.log(`🔍 Syncing Metadata for ${EMAIL}...`);

    // 1. Get User from DB
    const user = await prisma.user.findFirst({
        where: { email: { equals: EMAIL, mode: 'insensitive' } }
    });

    if (!user || !user.clerkId) {
        console.error('❌ User not found in DB or missing Clerk ID');
        return;
    }

    console.log(`Found DB User: ${user.id} (${user.role})`);

    // 2. Call Clerk API to Update Metadata
    const url = `https://api.clerk.com/v1/users/${user.clerkId}/metadata`;

    const body = {
        public_metadata: {
            role: 'SUPER',
            tenantId: user.tenantId, // Should be the placeholder one
            onboardingComplete: true
        }
    };

    console.log('📝 Updating Clerk Metadata...', JSON.stringify(body.public_metadata, null, 2));

    const response = await fetch(url, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.text();
        console.error('❌ Clerk Update Failed:', err);
    } else {
        const json = await response.json();
        console.log('✅ Clerk Metadata Synced Successfully!');
    }
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
