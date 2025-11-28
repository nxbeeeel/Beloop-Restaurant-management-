// Script to set a specific user as SUPER admin
import { prisma } from "../server/db";

async function main() {
    const email = "mnabeelca123@gmail.com";
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        console.error(`User with email ${email} not found`);
        process.exit(1);
    }
    await prisma.user.update({
        where: { email },
        data: { role: "SUPER" },
    });
    console.log(`User ${email} upgraded to SUPER role`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
