
import { createClerkClient } from '@clerk/backend';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });


const secretKey = process.env.CLERK_SECRET_KEY;
const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!secretKey) {
    console.error("Missing CLERK_SECRET_KEY");
    process.exit(1);
}

const clerk = createClerkClient({ secretKey, publishableKey });

async function main() {
    const email = "mnabeelca123@gmail.com";
    console.log(`Looking up user: ${email}...`);

    try {
        const userList = await clerk.users.getUserList({
            emailAddress: [email],
        });

        if (userList.data.length === 0) {
            console.error("User not found!");
            process.exit(1);
        }

        const user = userList.data[0];
        console.log(`Found User: ${user.id} (${user.firstName} ${user.lastName})`);

        console.log("Current Metadata:", user.publicMetadata);

        console.log("Locking as SUPER ADMIN...");

        await clerk.users.updateUser(user.id, {
            publicMetadata: {
                ...user.publicMetadata,
                role: "SUPER", // FORCE SUPER ROLE
            }
        });

        console.log("✅ SUCCESS! User is now permanently SUPER ADMIN.");
        console.log("User ID:", user.id);

    } catch (error) {
        console.error("Error:", error);
    }
}

main();
