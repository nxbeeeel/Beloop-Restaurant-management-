'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SuperSupportPage() {
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

    const { data, isLoading } = trpc.support.getAllTickets.useQuery({
        status: statusFilter === 'ALL' ? undefined : (statusFilter as any),
        priority: priorityFilter === 'ALL' ? undefined : (priorityFilter as any),
        limit: 50,
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
                    <p className="text-muted-foreground">Manage and resolve support requests</p>
                </div>
            </div>

            <div className="flex gap-4 items-center">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Statuses</SelectItem>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by Priority" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Priorities</SelectItem>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Tickets</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Tenant</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No tickets found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data?.items.map((ticket) => (
                                        <TableRow key={ticket.id}>
                                            <TableCell className="font-medium">
                                                <Link href={`/super/support/${ticket.id}`} className="hover:underline">
                                                    {ticket.subject}
                                                </Link>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {ticket._count.comments} comments
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Link href={`/super/tenants/${ticket.tenantId}`} className="hover:underline text-blue-600">
                                                    {ticket.tenant.name}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span>{ticket.user.name}</span>
                                                    <span className="text-xs text-muted-foreground">{ticket.user.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    ticket.status === 'OPEN' ? 'destructive' :
                                                        ticket.status === 'IN_PROGRESS' ? 'default' :
                                                            ticket.status === 'RESOLVED' ? 'secondary' : 'outline'
                                                }>
                                                    {ticket.status.replace('_', ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    ticket.priority === 'CRITICAL' ? 'destructive' :
                                                        ticket.priority === 'HIGH' ? 'destructive' :
                                                            ticket.priority === 'MEDIUM' ? 'default' : 'secondary'
                                                } className={ticket.priority === 'HIGH' ? 'bg-orange-500' : ''}>
                                                    {ticket.priority}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={`/super/support/${ticket.id}`}>View</Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
