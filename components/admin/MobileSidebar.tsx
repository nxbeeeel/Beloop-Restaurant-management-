'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LogoutButton } from "@/components/auth/LogoutButton";

export function MobileSidebar() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    const links = [
        { href: '/super/dashboard', label: 'Dashboard' },
        { href: '/super/tenants', label: 'Tenants' },
        { href: '/super/users', label: 'Users' },
        { href: '/super/support', label: 'Support' },
        { href: '/super/health', label: 'System Health' },
    ];

    return (
        <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="mb-4">
                <Menu className="h-6 w-6" />
            </Button>

            {isOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
                    <div
                        className="fixed inset-y-0 left-0 w-3/4 max-w-sm bg-gray-900 text-white p-6 shadow-lg transition-transform duration-300 ease-in-out"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-xl font-bold">🔧 Platform Admin</h2>
                            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white hover:text-white/80 hover:bg-white/10">
                                <X className="h-6 w-6" />
                            </Button>
                        </div>
                        <nav className="flex flex-col space-y-4 text-lg font-medium">
                            {links.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        "transition-colors hover:text-blue-400 py-2",
                                        pathname.startsWith(link.href) ? "text-blue-400" : "text-gray-300"
                                    )}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </nav>

                        <div className="mt-auto pt-8 border-t border-gray-800">
                            <LogoutButton variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
