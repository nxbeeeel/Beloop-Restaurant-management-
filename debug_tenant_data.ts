
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

console.log("DB URL PREFIX:", process.env.DATABASE_URL_UNPOOLED?.substring(0, 25) + "...");
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL_UNPOOLED
        }
    }
});

async function main() {
    console.log('--- USERS ---');
    const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true, tenantId: true }
    });
    console.table(users);

    console.log('\n--- TENANTS ---');
    const tenants = await prisma.tenant.findMany();
    console.table(tenants);

    console.log('\n--- OUTLETS ---');
    const outlets = await prisma.outlet.findMany({
        select: { id: true, name: true, status: true, tenantId: true }
    });
    console.table(outlets);

    if (outlets.length > 0 && users.length > 0) {
        console.log('\n--- ANALYSIS ---');
        const currentUser = users.find(u => u.role === 'BRAND_ADMIN'); // Assuming testing as Brand Admin
        if (currentUser) {
            console.log(`Brand Admin: ${currentUser.email} (TenantID: ${currentUser.tenantId})`);
            const matchingOutlets = outlets.filter(o => o.tenantId === currentUser.tenantId);
            console.log(`Matching Outlets for Brand Admin (Count: ${matchingOutlets.length}):`);
            console.table(matchingOutlets);
        } else {
            console.log('No BRAND_ADMIN user found to test against.');
        }
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
