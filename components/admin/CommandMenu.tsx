"use client"

import * as React from "react"
import {
    Calculator,
    Calendar,
    CreditCard,
    Settings,
    User,
    Search,
    LayoutDashboard,
    Building2,
    Store,
    LogOut
} from "lucide-react"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command"
import { useRouter } from "next/navigation"
import { useClerk } from "@clerk/nextjs"

export function CommandMenu() {
    const [open, setOpen] = React.useState(false)
    const router = useRouter();
    const { signOut } = useClerk();

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false)
        command()
    }, [])

    return (
        <>
            <div className="hidden xl:flex items-center gap-2">
                <button
                    onClick={() => setOpen(true)}
                    className="flex h-9 w-64 items-center gap-2 rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                    <Search className="h-4 w-4" />
                    <span>Search...</span>
                    <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                        <span className="text-xs">⌘</span>K
                    </kbd>
                </button>
            </div>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="Type a command or search..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup heading="Navigation">
                        <CommandItem onSelect={() => runCommand(() => router.push('/super/dashboard'))}>
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            <span>Dashboard</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push('/super/tenants'))}>
                            <Building2 className="mr-2 h-4 w-4" />
                            <span>Tenants</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push('/super/users'))}>
                            <User className="mr-2 h-4 w-4" />
                            <span>Users</span>
                        </CommandItem>
                    </CommandGroup>
                    <CommandGroup heading="Actions">
                        <CommandItem onSelect={() => runCommand(() => router.push('/super/tenants?action=create'))}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            <span>Create Tenant</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push('/super/settings'))}>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                        </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Account">
                        <CommandItem onSelect={() => runCommand(() => signOut())}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    )
}
