import { prisma } from "../server/db";

async function main() {
    const email = "mnabeelca123@gmail.com";
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        console.log(`User not found for ${email}`);
        return;
    }
    console.log(`User ${email} has role: ${user.role}`);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
