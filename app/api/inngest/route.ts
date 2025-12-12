
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { sendInviteEmail, sendBrandInviteEmail } from "@/server/inngest/functions";

// Create an API that serves zero-latency Inngest functions
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        sendInviteEmail,
        sendBrandInviteEmail
    ],
});
