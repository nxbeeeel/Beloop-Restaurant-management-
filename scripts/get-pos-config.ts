
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const outlet = await prisma.outlet.findFirst({
        where: {
            status: 'ACTIVE',
            isPosEnabled: true
        },
        include: {
            tenant: true
        }
    });

    if (!outlet) {
        console.log('No active POS-enabled outlet found.');
        // Try to find ANY outlet
        const anyOutlet = await prisma.outlet.findFirst({ include: { tenant: true } });
        if (anyOutlet) {
            console.log('Found non-active outlet:', anyOutlet.id, 'Tenant:', anyOutlet.tenantId);
            console.log('Use this but ENABLE POS first.');
        } else {
            console.log('No outlets found at all.');
        }
        return;
    }

    console.log('VALID CONFIGURATION FOUND:');
    console.log(`NEXT_PUBLIC_TENANT_ID="${outlet.tenantId}"`);
    console.log(`NEXT_PUBLIC_OUTLET_ID="${outlet.id}"`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
