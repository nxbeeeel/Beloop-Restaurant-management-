'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { Loader2, Send, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function UserTicketDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [comment, setComment] = useState('');

    const utils = trpc.useContext();
    const { data: ticket, isLoading } = trpc.support.getTicketDetails.useQuery({
        ticketId: params.id,
    });

    const addComment = trpc.support.addComment.useMutation({
        onSuccess: () => {
            setComment('');
            utils.support.getTicketDetails.invalidate({ ticketId: params.id });
            toast.success('Reply sent');
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
        <div className="container mx-auto py-8 px-4 space-y-6 max-w-4xl">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/support">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{ticket.subject}</h1>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <span>#{ticket.id.slice(-6)}</span>
                        <span>•</span>
                        <span>{format(new Date(ticket.createdAt), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                </div>
                <div className="ml-auto">
                    <Badge variant={
                        ticket.status === 'OPEN' ? 'destructive' :
                            ticket.status === 'IN_PROGRESS' ? 'default' :
                                ticket.status === 'RESOLVED' ? 'secondary' : 'outline'
                    } className="text-base px-3 py-1">
                        {ticket.status.replace('_', ' ')}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Description */}
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-base">Description</CardTitle>
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
                            <Card key={comment.id} className={comment.user.role === 'SUPER' ? 'bg-blue-50/50 border-blue-200' : ''}>
                                <CardHeader className="py-3">
                                    <div className="flex justify-between items-center">
                                        <div className="flex gap-2 items-center">
                                            <span className="font-semibold text-sm">
                                                {comment.user.role === 'SUPER' ? 'Support Team' : comment.user.name}
                                            </span>
                                            {comment.user.role === 'SUPER' && (
                                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-[10px] h-5">
                                                    Support
                                                </Badge>
                                            )}
                                            <span className="text-xs text-muted-foreground">
                                                {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                                            </span>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="py-3 pt-0 text-sm">
                                    <p className="whitespace-pre-wrap">{comment.content}</p>
                                </CardContent>
                            </Card>
                        ))}

                        {/* Add Comment */}
                        {ticket.status !== 'CLOSED' && (
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="space-y-4">
                                        <Textarea
                                            placeholder="Type your reply..."
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            rows={4}
                                        />
                                        <div className="flex justify-end">
                                            <Button
                                                onClick={() => addComment.mutate({ ticketId: ticket.id, content: comment })}
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
                        )}
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
                                <span className="text-muted-foreground block mb-1">Category</span>
                                <span className="font-medium">{ticket.category}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-1">Created By</span>
                                <div className="font-medium">{ticket.user.name}</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
