'use client';

import { BrandApplicationForm } from "@/components/forms/BrandApplicationForm";

export default function BrandApplicationPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-lg">
                <BrandApplicationForm />
            </div>
        </div>
    );
}
