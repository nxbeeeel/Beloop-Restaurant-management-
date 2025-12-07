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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Support Tickets</h1>
                    <p className="text-stone-400">Manage and resolve support requests</p>
                </div>
            </div>

            <div className="flex gap-4 items-center bg-stone-900 p-4 rounded-xl border border-stone-800">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px] bg-stone-950 border-stone-800 text-white">
                        <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-stone-900 border-stone-800 text-white">
                        <SelectItem value="ALL">All Statuses</SelectItem>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[180px] bg-stone-950 border-stone-800 text-white">
                        <SelectValue placeholder="Filter by Priority" />
                    </SelectTrigger>
                    <SelectContent className="bg-stone-900 border-stone-800 text-white">
                        <SelectItem value="ALL">All Priorities</SelectItem>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card className="bg-stone-900 border-stone-800">
                <CardHeader>
                    <CardTitle className="text-white">All Tickets</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-stone-800 hover:bg-transparent">
                                    <TableHead className="text-stone-400">Subject</TableHead>
                                    <TableHead className="text-stone-400">Tenant</TableHead>
                                    <TableHead className="text-stone-400">User</TableHead>
                                    <TableHead className="text-stone-400">Status</TableHead>
                                    <TableHead className="text-stone-400">Priority</TableHead>
                                    <TableHead className="text-stone-400">Created</TableHead>
                                    <TableHead className="text-right text-stone-400">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.items.length === 0 ? (
                                    <TableRow className="border-stone-800">
                                        <TableCell colSpan={7} className="text-center py-8 text-stone-500">
                                            No tickets found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data?.items.map((ticket) => (
                                        <TableRow key={ticket.id} className="border-stone-800 hover:bg-stone-800/50">
                                            <TableCell className="font-medium">
                                                <Link href={`/super/support/${ticket.id}`} className="hover:underline text-rose-400">
                                                    {ticket.subject}
                                                </Link>
                                                <div className="text-xs text-stone-500 mt-1">
                                                    {ticket._count.comments} comments
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Link href={`/super/tenants/${ticket.tenantId}`} className="hover:underline text-blue-400">
                                                    {ticket.tenant.name}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-white">{ticket.user.name}</span>
                                                    <span className="text-xs text-stone-500">{ticket.user.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={
                                                    ticket.status === 'OPEN' ? 'border-red-500/50 text-red-400 bg-red-500/10' :
                                                        ticket.status === 'IN_PROGRESS' ? 'border-blue-500/50 text-blue-400 bg-blue-500/10' :
                                                            ticket.status === 'RESOLVED' ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' : 'border-stone-700 text-stone-400'
                                                }>
                                                    {ticket.status.replace('_', ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={
                                                    ticket.priority === 'CRITICAL' ? 'border-red-500 text-red-500 bg-red-950' :
                                                        ticket.priority === 'HIGH' ? 'border-orange-500 text-orange-500 bg-orange-950' :
                                                            ticket.priority === 'MEDIUM' ? 'border-yellow-500 text-yellow-500 bg-yellow-950' : 'border-stone-700 text-stone-400'
                                                }>
                                                    {ticket.priority}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-stone-400">
                                                {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" asChild className="text-stone-400 hover:text-white hover:bg-stone-800">
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
