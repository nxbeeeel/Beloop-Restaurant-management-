
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const EMAIL = 'beloopstore@gmail.com';
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || 'sk_test_ALJK6FJQ3krPlBbdBSOAm5BZHovhQn1kxcd2TOWQvh';

async function main() {
    // 1. Get User from DB
    const user = await prisma.user.findFirst({
        where: {
            email: { equals: EMAIL, mode: 'insensitive' }
        },
        include: {
            outlet: true
        }
    });

    if (!user || !user.clerkId) {
        console.error('User not found or missing Clerk ID in DB');
        return;
    }

    console.log(`Found User: ${user.email}`);
    console.log(`Clerk ID: ${user.clerkId}`);
    console.log(`Target Tenant: ${user.tenantId}`);
    console.log(`Target Outlet: ${user.outletId}`);

    // 2. Call Clerk API
    const url = `https://api.clerk.com/v1/users/${user.clerkId}/metadata`;

    const body = {
        public_metadata: {
            role: user.role,
            tenantId: user.tenantId,
            outletId: user.outletId,
            onboardingComplete: true
        }
    };

    console.log('Updating Clerk Metadata...');
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
        console.error('Clerk Update Failed:', err);
    } else {
        const json = await response.json();
        console.log('✅ Clerk Metadata Updated Successfully!');
        console.log(JSON.stringify(json.public_metadata, null, 2));
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
