
import { createClerkClient } from '@clerk/nextjs/server';
import dotenv from 'dotenv';
dotenv.config();

const client = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
});

async function main() {
    console.log("🔍 Diagnosing Clerk Permissions...");
    console.log(`User/Creator ID: user_36YCfDC2SUMzvSvFyPhhtLE1Jmv`);

    try {
        console.log("1. Fetching User Details...");
        const user = await client.users.getUser('user_36YCfDC2SUMzvSvFyPhhtLE1Jmv');
        console.log(`   User Found: ${user.firstName} ${user.lastName} (${user.primaryEmailAddress?.emailAddress})`);
    } catch (e: any) {
        console.error("   ❌ Failed to fetch user:", e.errors?.[0]?.message || e.message);
    }

    try {
        console.log("2. Attempting to Create Organization via API...");
        const slug = `debug-test-${Date.now()}`;

        const org = await client.organizations.createOrganization({
            name: "Debug Test Brand",
            slug: slug,
            createdBy: 'user_36YCfDC2SUMzvSvFyPhhtLE1Jmv'
        });

        console.log(`   ✅ Success! Created Org: ${org.id} (${org.slug})`);

        // Cleanup
        await client.organizations.deleteOrganization(org.id);
        console.log("   🧹 Cleaned up (Deleted Org)");

    } catch (e: any) {
        console.error("   ❌ Failed to create organization:");
        console.error(JSON.stringify(e, null, 2));
    }
}

main();
