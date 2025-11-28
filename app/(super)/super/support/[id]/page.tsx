'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { Loader2, Send, ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function TicketDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [comment, setComment] = useState('');
    const [isInternal, setIsInternal] = useState(false);

    const utils = trpc.useContext();
    const { data: ticket, isLoading } = trpc.support.getTicketDetails.useQuery({
        ticketId: params.id,
    });

    const addComment = trpc.support.addComment.useMutation({
        onSuccess: () => {
            setComment('');
            setIsInternal(false);
            utils.support.getTicketDetails.invalidate({ ticketId: params.id });
            toast.success('Comment added');
        },
        onError: (error) => toast.error(error.message),
    });

    const updateStatus = trpc.support.updateTicketStatus.useMutation({
        onSuccess: () => {
            utils.support.getTicketDetails.invalidate({ ticketId: params.id });
            toast.success('Status updated');
        },
        onError: (error) => toast.error(error.message),
    });

    if (isLoading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!ticket) {
        return <div>Ticket not found</div>;
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/super/support">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{ticket.subject}</h1>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <span>#{ticket.id.slice(-6)}</span>
                        <span>•</span>
                        <span>{format(new Date(ticket.createdAt), 'MMM d, yyyy h:mm a')}</span>
                        <span>•</span>
                        <Link href={`/super/tenants/${ticket.tenantId}`} className="hover:underline text-blue-600">
                            {ticket.tenant.name}
                        </Link>
                    </div>
                </div>
                <div className="ml-auto flex gap-2">
                    <Select
                        value={ticket.status}
                        onValueChange={(val: any) => updateStatus.mutate({ ticketId: ticket.id, status: val })}
                        disabled={updateStatus.isPending}
                    >
                        <SelectTrigger className="w-[140px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="OPEN">Open</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="RESOLVED">Resolved</SelectItem>
                            <SelectItem value="CLOSED">Closed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Description */}
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div className="flex gap-2 items-center">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                        {ticket.user.name[0]}
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">{ticket.user.name}</CardTitle>
                                        <CardDescription>{ticket.user.role}</CardDescription>
                                    </div>
                                </div>
                                <Badge variant="outline">{ticket.category}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="whitespace-pre-wrap">{ticket.description}</p>
                        </CardContent>
                    </Card>

                    {/* Comments */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Discussion</h3>
                        {ticket.comments.map((comment) => (
                            <Card key={comment.id} className={comment.isInternal ? 'bg-yellow-50/50 border-yellow-200' : ''}>
                                <CardHeader className="py-3">
                                    <div className="flex justify-between items-center">
                                        <div className="flex gap-2 items-center">
                                            <span className="font-semibold text-sm">{comment.user.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                                            </span>
                                        </div>
                                        {comment.isInternal && (
                                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                                <Lock className="h-3 w-3 mr-1" /> Internal Note
                                            </Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="py-3 pt-0 text-sm">
                                    <p className="whitespace-pre-wrap">{comment.content}</p>
                                </CardContent>
                            </Card>
                        ))}

                        {/* Add Comment */}
                        <Card>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <Textarea
                                        placeholder="Type your reply..."
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        rows={4}
                                    />
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="internal"
                                                checked={isInternal}
                                                onCheckedChange={(checked) => setIsInternal(checked as boolean)}
                                            />
                                            <label
                                                htmlFor="internal"
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1"
                                            >
                                                <Lock className="h-3 w-3" /> Internal Note
                                            </label>
                                        </div>
                                        <Button
                                            onClick={() => addComment.mutate({ ticketId: ticket.id, content: comment, isInternal })}
                                            disabled={!comment.trim() || addComment.isPending}
                                        >
                                            {addComment.isPending ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            ) : (
                                                <Send className="h-4 w-4 mr-2" />
                                            )}
                                            Send Reply
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Ticket Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div>
                                <span className="text-muted-foreground block mb-1">Priority</span>
                                <Badge variant={
                                    ticket.priority === 'CRITICAL' ? 'destructive' :
                                        ticket.priority === 'HIGH' ? 'destructive' :
                                            ticket.priority === 'MEDIUM' ? 'default' : 'secondary'
                                }>
                                    {ticket.priority}
                                </Badge>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-1">Status</span>
                                <Badge variant="outline">{ticket.status.replace('_', ' ')}</Badge>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-1">Category</span>
                                <span className="font-medium">{ticket.category}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-1">Tenant</span>
                                <Link href={`/super/tenants/${ticket.tenantId}`} className="text-blue-600 hover:underline font-medium">
                                    {ticket.tenant.name}
                                </Link>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-1">Created By</span>
                                <div className="font-medium">{ticket.user.name}</div>
                                <div className="text-xs text-muted-foreground">{ticket.user.email}</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
