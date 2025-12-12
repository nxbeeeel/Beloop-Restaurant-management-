
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { sendInviteEmail, sendBrandInviteEmail, nightlyAggregation } from "@/server/inngest/functions";

// Create an API that serves Inngest functions
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        sendInviteEmail,
        sendBrandInviteEmail,
        nightlyAggregation
    ],
    signingKey: process.env.INNGEST_SIGNING_KEY,
});
