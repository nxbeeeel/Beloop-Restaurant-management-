import { PrismaClient, Prisma } from "@prisma/client";

export class LedgerService {
    /**
     * Post a Double-Entry Journal
     * @param prisma - Prisma Client or Transaction Client
     */
    static async postEntry(prisma: PrismaClient | Prisma.TransactionClient, params: {
        outletId: string;
        date?: Date;
        description: string;
        referenceId?: string;
        referenceType?: string;
        lines: {
            accountId?: string; // If known
            accountName?: string; // Or lookup by name (e.g. "Cash on Hand")
            debit: number;
            credit: number;
        }[];
    }) {
        // Validation: Credits must equal Debits
        const totalDebit = params.lines.reduce((sum, line) => sum + line.debit, 0);
        const totalCredit = params.lines.reduce((sum, line) => sum + line.credit, 0);

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new Error(`Unbalanced Ledger Entry: Debit ${totalDebit} != Credit ${totalCredit}`);
        }

        // Resolve Accounts
        const resolvedLines = [];
        for (const line of params.lines) {
            let accountId = line.accountId;
            if (!accountId && line.accountName) {
                const account = await prisma.financialAccount.findFirst({
                    where: { outletId: params.outletId, name: line.accountName }
                });
                if (!account) throw new Error(`Account not found: ${line.accountName}`);
                accountId = account.id;
            }
            if (!accountId) throw new Error("Line missing accountId or accountName");

            resolvedLines.push({ ...line, accountId });
        }

        // Create Journal + Lines
        const journal = await prisma.journalEntry.create({
            data: {
                outletId: params.outletId,
                date: params.date || new Date(),
                description: params.description,
                referenceId: params.referenceId,
                referenceType: params.referenceType,
                lines: {
                    create: resolvedLines.map(line => ({
                        accountId: line.accountId!,
                        debit: line.debit,
                        credit: line.credit,
                        description: params.description
                    }))
                }
            }
        });

        // Update Account Balances
        for (const line of resolvedLines) {
            const account = await prisma.financialAccount.findUnique({ where: { id: line.accountId! } });
            if (!account) continue;

            let balanceChange = 0;
            // Accounting Equation Logic:
            // Assets, Expenses: Debit increases (+), Credit decreases (-)
            // Liabilities, Equity, Revenue: Credit increases (+), Debit decreases (-)
            if (['ASSET', 'EXPENSE'].includes(account.type)) {
                balanceChange = line.debit - line.credit;
            } else {
                balanceChange = line.credit - line.debit;
            }

            await prisma.financialAccount.update({
                where: { id: line.accountId! },
                data: { balance: { increment: balanceChange } }
            });
        }

        return journal;
    }
}
