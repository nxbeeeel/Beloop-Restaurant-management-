
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const CONFIG_ID = 'cm4bk1u8y0003cpeb37m3zgol';

async function main() {
    const o = await prisma.outlet.findUnique({
        where: { id: CONFIG_ID },
        include: {
            _count: { select: { products: true } }
        }
    });

    if (!o) {
        console.log('CONFIGURED OUTLET NOT FOUND!');
    } else {
        console.log(`ID: ${o.id}`);
        console.log(`Name: "${o.name}"`);
        console.log(`Products: ${o._count.products}`);
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
