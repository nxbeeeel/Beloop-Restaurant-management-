import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-4">
            <div className="flex max-w-md flex-col items-center text-center">
                <div className="mb-4 rounded-full bg-gray-100 p-3">
                    <FileQuestion className="h-8 w-8 text-gray-600" />
                </div>
                <h2 className="mb-2 text-2xl font-bold text-gray-900">Page Not Found</h2>
                <p className="mb-8 text-gray-600">The page you&apos;re looking for doesn&apos;t exist.</p>
                <Link href="/">
                    <Button>Go Home</Button>
                </Link>
            </div>
        </div>
    );
}
