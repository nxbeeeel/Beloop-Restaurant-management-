
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import {
    sendInviteEmail,
    sendBrandInviteEmail,
    nightlyAggregation,
    processSale,
    processStockMove
} from "@/server/inngest/functions";

// Create an API that serves Inngest functions
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        sendInviteEmail,
        sendBrandInviteEmail,
        nightlyAggregation,
        // POS Async Write Functions
        processSale,
        processStockMove,
    ],
    signingKey: process.env.INNGEST_SIGNING_KEY,
});
