'use client';

import { trpc } from "@/lib/trpc";
import { Plus, Search, User, MoreHorizontal, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from 'react';

import { InviteUserDialog } from "@/components/super/InviteUserDialog";
import { UserActions } from "@/components/super/UserActions";

export default function UserManagementPage() {
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('ALL');
    const [isInviteOpen, setIsInviteOpen] = useState(false);

    const { data: users, isLoading } = trpc.superAdmin.users.list.useQuery({
        search: search,
        role: roleFilter === 'ALL' ? undefined : (roleFilter as any)
    });

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Users</h2>
                    <p className="text-stone-400">Manage system-wide user access and roles.</p>
                </div>
                <Button
                    onClick={() => setIsInviteOpen(true)}
                    className="bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/20"
                >
                    <Mail className="w-4 h-4 mr-2" />
                    Invite User
                </Button>
                <InviteUserDialog open={isInviteOpen} onOpenChange={setIsInviteOpen} />
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-4 bg-stone-900 p-4 rounded-xl border border-stone-800">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                    <Input
                        placeholder="Search users by name or email..."
                        className="pl-9 bg-stone-950 border-stone-800 text-white placeholder:text-stone-600 focus-visible:ring-rose-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[180px] bg-stone-950 border-stone-800 text-white">
                        <SelectValue placeholder="Filter Role" />
                    </SelectTrigger>
                    <SelectContent className="bg-stone-900 border-stone-800 text-white">
                        <SelectItem value="ALL">All Roles</SelectItem>
                        <SelectItem value="SUPER">Super Admin</SelectItem>
                        <SelectItem value="BRAND_ADMIN">Brand Admin</SelectItem>
                        <SelectItem value="OUTLET_MANAGER">Outlet Manager</SelectItem>
                        <SelectItem value="STAFF">Staff</SelectItem>
                    </SelectContent>
                </Select>
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
                    users?.map((user) => (
                        <Card key={user.id} className="bg-stone-900 border-stone-800 hover:bg-stone-800/50 transition-colors group">
                            <div className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-10 w-10 border border-stone-700">
                                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} />
                                        <AvatarFallback className="bg-stone-800 text-stone-400">
                                            {user.name?.charAt(0) || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="font-bold text-base text-white">{user.name}</h3>
                                        <p className="text-sm text-stone-500">{user.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    {/* Tenant Info if applicable */}
                                    {user.tenant && (
                                        <div className="hidden md:block text-right">
                                            <p className="text-sm font-medium text-stone-300">{user.tenant.name}</p>
                                            <p className="text-xs text-stone-500">Tenant</p>
                                        </div>
                                    )}

                                    <Badge variant={user.role === 'SUPER' ? 'default' : 'secondary'} className={user.role === 'SUPER' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-stone-800 text-stone-400 border-stone-700'}>
                                        {user.role.replace('_', ' ')}
                                    </Badge>

                                    <Badge variant="outline" className={`
                                        bg-opacity-10 
                                        ${user.isActive ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500' : 'border-red-500/20 bg-red-500/10 text-red-500'}
                                    `}>
                                        {user.isActive ? 'Active' : 'Suspended'}
                                    </Badge>

                                    <UserActions user={user} />
                                </div>
                            </div>
                        </Card>
                    ))
                )}

                {(!isLoading && (!users || users.length === 0)) && (
                    <div className="text-center py-20 bg-stone-900 rounded-xl border border-stone-800 border-dashed">
                        <User className="w-12 h-12 text-stone-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">No Users Found</h3>
                        <p className="text-stone-500">Try adjusting your filters.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
