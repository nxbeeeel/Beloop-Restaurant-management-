import { z } from "zod";

const googleSheetsConfigSchema = z.object({
    outletId: z.string(),
    appsScriptUrl: z.string().url(),
    enabled: z.boolean().default(true),
});

export type GoogleSheetsConfig = z.infer<typeof googleSheetsConfigSchema>;

export async function sendToGoogleSheets(
    appsScriptUrl: string,
    data: {
        type: 'sales' | 'expenses' | 'both';
        outletName: string;
        month: number;
        year: number;
        sales?: Array<{
            date: string;
            cashSale: number;
            bankSale: number;
            swiggy: number;
            zomato: number;
            totalSale: number;
            submittedBy: string;
        }>;
        expenses?: Array<{
            date: string;
            category: string;
            amount: number;
            description: string;
            submittedBy: string;
        }>;
    }
) {
    try {
        const response = await fetch(appsScriptUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error sending data to Google Sheets:', error);
        throw error;
    }
}
