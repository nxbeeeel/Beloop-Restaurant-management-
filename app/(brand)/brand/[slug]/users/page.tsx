'use client';

import { trpc } from "@/lib/trpc";
import { Plus, Search, User, Mail, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, UserX, UserCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { InviteUserDialog } from "./InviteUserDialog";

export default function UsersPage() {
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('ALL');
    const [isInviteOpen, setIsInviteOpen] = useState(false);

    const utils = trpc.useUtils();
    const { data: users, isLoading } = trpc.brand.listUsers.useQuery({
        search: search || undefined,
        role: roleFilter === 'ALL' ? undefined : (roleFilter as any)
    });

    const { data: outlets } = trpc.brand.listOutlets.useQuery();

    const suspendMutation = trpc.brand.suspendUser.useMutation({
        onSuccess: () => {
            utils.brand.listUsers.invalidate();
            toast.success("User suspended");
        },
        onError: (e) => toast.error(e.message),
    });

    const unsuspendMutation = trpc.brand.unsuspendUser.useMutation({
        onSuccess: () => {
            utils.brand.listUsers.invalidate();
            toast.success("User reactivated");
        },
        onError: (e) => toast.error(e.message),
    });

    const deleteMutation = trpc.brand.deleteUser.useMutation({
        onSuccess: () => {
            utils.brand.listUsers.invalidate();
            toast.success("User removed");
        },
        onError: (e) => toast.error(e.message),
    });

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Team</h2>
                    <p className="text-muted-foreground">Manage your team members and their access.</p>
                </div>
                <Button
                    onClick={() => setIsInviteOpen(true)}
                    className="bg-primary hover:bg-primary/90 text-white shadow-lg"
                >
                    <Mail className="w-4 h-4 mr-2" />
                    Invite User
                </Button>
                <InviteUserDialog
                    open={isInviteOpen}
                    onOpenChange={setIsInviteOpen}
                    outlets={outlets?.map(o => ({ id: o.id, name: o.name })) || []}
                />
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-4 bg-card p-4 rounded-xl border">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or email..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter Role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Roles</SelectItem>
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
                            <Skeleton key={i} className="h-20 w-full rounded-xl" />
                        ))}
                    </div>
                ) : (
                    users?.map((user) => (
                        <Card key={user.id} className="hover:shadow-md transition-shadow">
                            <div className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} />
                                        <AvatarFallback>
                                            {user.name?.charAt(0) || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="font-bold text-base">{user.name}</h3>
                                        <p className="text-sm text-muted-foreground">{user.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {/* Outlet Info */}
                                    {user.outlet && (
                                        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                                            <Building2 className="h-4 w-4" />
                                            {user.outlet.name}
                                        </div>
                                    )}

                                    <Badge variant="secondary">
                                        {user.role.replace('_', ' ')}
                                    </Badge>

                                    <Badge variant="outline" className={
                                        user.isActive
                                            ? 'border-green-500/30 bg-green-500/10 text-green-600'
                                            : 'border-red-500/30 bg-red-500/10 text-red-600'
                                    }>
                                        {user.isActive ? 'Active' : 'Suspended'}
                                    </Badge>

                                    {/* Actions Menu */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {user.isActive ? (
                                                <DropdownMenuItem
                                                    onClick={() => suspendMutation.mutate({ userId: user.id })}
                                                    className="text-yellow-600"
                                                >
                                                    <UserX className="h-4 w-4 mr-2" />
                                                    Suspend User
                                                </DropdownMenuItem>
                                            ) : (
                                                <DropdownMenuItem
                                                    onClick={() => unsuspendMutation.mutate({ userId: user.id })}
                                                    className="text-green-600"
                                                >
                                                    <UserCheck className="h-4 w-4 mr-2" />
                                                    Reactivate User
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    if (confirm('Are you sure you want to remove this user?')) {
                                                        deleteMutation.mutate({ userId: user.id });
                                                    }
                                                }}
                                                className="text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Remove User
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </Card>
                    ))
                )}

                {(!isLoading && (!users || users.length === 0)) && (
                    <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed">
                        <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-2">No Team Members</h3>
                        <p className="text-muted-foreground mb-4">Invite your first team member to get started.</p>
                        <Button onClick={() => setIsInviteOpen(true)}>
                            <Mail className="w-4 h-4 mr-2" />
                            Invite User
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
