'use client';

import { trpc } from "@/lib/trpc";
import { Plus, Search, User, MoreHorizontal, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function UserManagementPage() {
    // For now, using a mocked query or reusing recent activity as we don't have a full listing procedure yet
    // I will use recent activity and filter unique users for the visual demo
    const { data: activities, isLoading } = trpc.superAnalytics.getRecentActivity.useQuery({ limit: 50 });

    // Mock users for UI
    const users = [
        { id: '1', name: 'Nabeel C A', email: 'mnabeelca123@gmail.com', role: 'SUPER', status: 'Active' },
        { id: '2', name: 'Demo Admin', email: 'admin@beloop.demo', role: 'BRAND_ADMIN', status: 'Active' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Users</h2>
                    <p className="text-stone-400">Manage system-wide user access and roles.</p>
                </div>
                <Button className="bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/20">
                    <Mail className="w-4 h-4 mr-2" />
                    Invite User
                </Button>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-4 bg-stone-900 p-4 rounded-xl border border-stone-800">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                    <Input
                        placeholder="Search users by name or email..."
                        className="pl-9 bg-stone-950 border-stone-800 text-white placeholder:text-stone-600 focus-visible:ring-rose-500"
                    />
                </div>
                <Button variant="outline" className="border-stone-800 text-stone-300 hover:bg-stone-800 hover:text-white">
                    Filter Role
                </Button>
            </div>

            {/* User List */}
            <div className="grid gap-4">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-20 w-full bg-stone-900 rounded-xl" />
                        ))}
                    </div>
                ) : (
                    users.map((user) => (
                        <Card key={user.id} className="bg-stone-900 border-stone-800 hover:bg-stone-800/50 transition-colors group">
                            <div className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-10 w-10 border border-stone-700">
                                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} />
                                        <AvatarFallback className="bg-stone-800 text-stone-400">
                                            {user.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="font-bold text-base text-white">{user.name}</h3>
                                        <p className="text-sm text-stone-500">{user.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <Badge variant={user.role === 'SUPER' ? 'default' : 'secondary'} className={user.role === 'SUPER' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-stone-800 text-stone-400 border-stone-700'}>
                                        {user.role}
                                    </Badge>

                                    <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
                                        {user.status}
                                    </Badge>

                                    <Button variant="ghost" size="icon" className="text-stone-400 hover:text-white hover:bg-stone-800">
                                        <MoreHorizontal className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
