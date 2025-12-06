
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Searching for outlet 'Chaya One'...");
    const outlets = await prisma.outlet.findMany({
        where: {
            name: {
                contains: 'Chaya',
                mode: 'insensitive'
            }
        },
        include: {
            tenant: true
        }
    });

    if (outlets.length === 0) {
        console.log('No outlets found with name containing "Chaya".');

        // List all outlets to help debug
        const all = await prisma.outlet.findMany({ take: 5 });
        console.log('--- FIRST 5 OUTLETS ---');
        all.forEach(o => console.log(`${o.name} (${o.id}) - Tenant: ${o.tenantId}`));
    } else {
        console.log(`Found ${outlets.length} match(es):`);
        for (const o of outlets) {
            console.log(`Name: ${o.name}`);
            console.log(`ID: ${o.id}`);
            console.log(`Tenant ID: ${o.tenantId}`);
            console.log(`Current Config ID: cm4bk1u8y0003cpeb37m3zgol`);
            console.log(`MATCH? ${o.id === 'cm4bk1u8y0003cpeb37m3zgol' ? 'YES' : 'NO'}`);
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
