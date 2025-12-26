'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CreateOutletDialog } from "./CreateOutletDialog";

export function AddOutletButton() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button
                onClick={() => setOpen(true)}
                className="shadow-lg hover:shadow-xl transition-all duration-200"
            >
                <Plus className="mr-2 h-4 w-4" /> Add Outlet
            </Button>
            <CreateOutletDialog open={open} onOpenChange={setOpen} />
        </>
    );
}
