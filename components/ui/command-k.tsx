'use client';

import * as React from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import {
    Calculator,
    Calendar,
    CreditCard,
    Settings,
    Smile,
    User,
    Search,
    LayoutDashboard,
    Box,
    PlusCircle,
    LogOut
} from 'lucide-react';
import { useClerk } from '@clerk/nextjs';

/**
 * Command-K Global Spotlight
 * 
 * Provides keyboard-first navigation and actions across the enterprise platform.
 */
export function CommandK() {
    const [open, setOpen] = React.useState(false);
    const router = useRouter();
    const { signOut } = useClerk();

    // Toggle with Cmd+K
    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false);
        command();
    }, []);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[20vh]">
            <div className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <Command className="w-full" label="Global Command Menu">
                    <div className="flex items-center border-b border-stone-800 px-3" cmdk-input-wrapper="">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-white" />
                        <Command.Input
                            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-stone-500 disabled:cursor-not-allowed disabled:opacity-50 text-white"
                            placeholder="Type a command or search..."
                        />
                    </div>
                    <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2 text-stone-200">
                        <Command.Empty className="py-6 text-center text-sm text-stone-500">
                            No results found.
                        </Command.Empty>

                        <Command.Group heading="Navigation" className="px-2 py-1.5 text-xs font-medium text-stone-500">
                            <Command.Item
                                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-rose-600 aria-selected:text-white data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                onSelect={() => runCommand(() => router.push('/'))}
                            >
                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                <span>Dashboard</span>
                            </Command.Item>
                            <Command.Item
                                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-rose-600 aria-selected:text-white"
                                onSelect={() => runCommand(() => router.push('/outlet/inventory'))}
                            >
                                <Box className="mr-2 h-4 w-4" />
                                <span>Inventory</span>
                            </Command.Item>
                            <Command.Item
                                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-rose-600 aria-selected:text-white"
                                onSelect={() => runCommand(() => router.push('/settings'))}
                            >
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Settings</span>
                            </Command.Item>
                        </Command.Group>

                        <Command.Separator className="my-1 h-px bg-stone-800" />

                        <Command.Group heading="Actions" className="px-2 py-1.5 text-xs font-medium text-stone-500">
                            <Command.Item
                                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-rose-600 aria-selected:text-white"
                                onSelect={() => runCommand(() => router.push('/outlet/inventory/new'))}
                            >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                <span>Add Product</span>
                            </Command.Item>
                            <Command.Item
                                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-rose-600 aria-selected:text-white"
                                onSelect={() => runCommand(() => router.push('/support/ticket/new'))}
                            >
                                <Smile className="mr-2 h-4 w-4" />
                                <span>Submit Feedback / Ticket</span>
                            </Command.Item>
                        </Command.Group>

                        <Command.Separator className="my-1 h-px bg-stone-800" />

                        <Command.Group heading="Account" className="px-2 py-1.5 text-xs font-medium text-stone-500">
                            <Command.Item
                                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-rose-600 aria-selected:text-white"
                                onSelect={() => runCommand(() => { })}
                            >
                                <User className="mr-2 h-4 w-4" />
                                <span>Profile</span>
                            </Command.Item>
                            <Command.Item
                                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-rose-600 aria-selected:text-white"
                                onSelect={() => runCommand(() => signOut(() => router.push('/')))}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </Command.Item>
                        </Command.Group>
                    </Command.List>

                    <div className="border-t border-stone-800 p-2 flex justify-between items-center text-[10px] text-stone-500 px-4">
                        <span>Press <strong>ESC</strong> to close</span>
                        <span>Project Phoenix v1.0</span>
                    </div>
                </Command>
            </div>
        </div>
    );
}
