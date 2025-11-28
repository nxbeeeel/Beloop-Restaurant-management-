import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function SubmitSuccessPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>

            <div className="space-y-2">
                <h1 className="text-3xl font-bold">Submission Successful!</h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                    Your daily sales and expenses have been recorded. The dashboard has been updated.
                </p>
            </div>

            <div className="flex gap-4">
                <Link href="/submit">
                    <Button variant="outline">Submit Another</Button>
                </Link>
                <Link href="/">
                    <Button>Go to Dashboard</Button>
                </Link>
            </div>
        </div>
    );
}
