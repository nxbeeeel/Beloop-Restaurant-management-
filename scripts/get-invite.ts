
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();

async function getLink() {
    const invite = await prisma.invitation.findFirst({
        orderBy: { createdAt: 'desc' },
        where: { status: 'PENDING' }
    });

    if (invite) {
        const link = `http://localhost:3000/signup?token=${invite.token}`;
        fs.writeFileSync('link.txt', link);
        console.log('Link written to link.txt');
    } else {
        fs.writeFileSync('link.txt', 'No pending invite found.');
    }
}

getLink()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
