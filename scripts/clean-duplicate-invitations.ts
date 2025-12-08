// Clean Duplicate Invitations Script
// Run this BEFORE deploying to fix the unique constraint violation

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDuplicateInvitations() {
    console.log('🔍 Finding duplicate invitations...');

    // Find all invitations grouped by the unique constraint fields
    const invitations = await prisma.invitation.findMany({
        orderBy: { createdAt: 'desc' }, // Keep the most recent ones
    });

    // Group by unique constraint: email + inviteRole + outletId + status
    const groups = new Map<string, any[]>();

    for (const inv of invitations) {
        const key = `${inv.email}|${inv.inviteRole}|${inv.outletId}|${inv.status}`;
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(inv);
    }

    // Find duplicates
    const duplicates: string[] = [];
    for (const [key, group] of groups.entries()) {
        if (group.length > 1) {
            console.log(`\n⚠️  Found ${group.length} duplicates for: ${key}`);
            // Keep the first (most recent), delete the rest
            for (let i = 1; i < group.length; i++) {
                duplicates.push(group[i].id);
                console.log(`   - Will delete: ${group[i].id} (created: ${group[i].createdAt})`);
            }
        }
    }

    if (duplicates.length === 0) {
        console.log('\n✅ No duplicates found!');
        return;
    }

    console.log(`\n🗑️  Deleting ${duplicates.length} duplicate invitations...`);

    const result = await prisma.invitation.deleteMany({
        where: {
            id: { in: duplicates }
        }
    });

    console.log(`✅ Deleted ${result.count} duplicate invitations`);
    console.log('\n✅ Database is now ready for unique constraint!');
}

cleanDuplicateInvitations()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
