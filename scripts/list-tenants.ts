
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const tenants = await prisma.tenant.findMany({
        include: {
            _count: {
                select: { users: true, outlets: true }
            }
        }
    });

    console.log('--- ALL TENANTS IN DB ---');
    console.table(tenants.map(t => ({
        id: t.id,
        name: t.name,
        users: t._count.users,
        outlets: t._count.outlets,
        hasPaid: 'Unknown (Plan logic)'
    })));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
