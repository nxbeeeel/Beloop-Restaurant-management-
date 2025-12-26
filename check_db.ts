
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
    const tenants = await prisma.tenant.findMany({
        include: {
            outlets: true,
            users: true
        }
    });

    console.log(`Found ${tenants.length} tenants.`);
    for (const t of tenants) {
        console.log(`Tenant: ${t.name} (${t.slug})`);
        console.log(`  Users: ${t.users.length}`);
        console.log(`  Outlets: ${t.outlets.length}`);
        t.outlets.forEach(o => {
            console.log(`    - [${o.status}] ${o.name} (${o.id})`);
        });
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
