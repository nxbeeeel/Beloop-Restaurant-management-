import { prisma } from '../server/db';

async function main() {
    // Get all tenants and outlets
    const tenants = await prisma.tenant.findMany({
        include: {
            outlets: true,
        },
    });

    console.log('\n=== Available Tenants and Outlets ===\n');

    for (const tenant of tenants) {
        console.log(`Tenant: ${tenant.name}`);
        console.log(`  ID: ${tenant.id}`);
        console.log(`  Outlets:`);

        for (const outlet of tenant.outlets) {
            console.log(`    - ${outlet.name}`);
            console.log(`      ID: ${outlet.id}`);
        }
        console.log('');
    }

    await prisma.$disconnect();
}

main().catch(console.error);
