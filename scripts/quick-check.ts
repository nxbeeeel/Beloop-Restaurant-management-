
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function k() {
    const u = await prisma.user.findFirst({ where: { email: "mnabeelca123@gmail.com" } });
    console.log("--------------------------------");
    console.log("ROLE:", u?.role);
    console.log("TENANT:", u?.tenantId);
    console.log("--------------------------------");
}
k();
