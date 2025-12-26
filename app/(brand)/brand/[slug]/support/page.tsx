'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Phone, ExternalLink, TicketCheck, FileText } from "lucide-react";

export default function SupportPage() {
    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Help & Support</h1>
                <p className="text-muted-foreground mt-2">
                    Need assistance? We are here to help you succeed with Beloop.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Contact Options */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-rose-600" /> Contact Support
                        </CardTitle>
                        <CardDescription>
                            Get in touch with our support team directly.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg">
                            <div className="bg-rose-100 p-2 rounded-full">
                                <Mail className="h-5 w-5 text-rose-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Email Support</p>
                                <a href="mailto:support@beloop.io" className="text-sm text-blue-600 hover:underline">
                                    support@beloop.io
                                </a>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg">
                            <div className="bg-rose-100 p-2 rounded-full">
                                <Phone className="h-5 w-5 text-rose-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Phone / WhatsApp</p>
                                <p className="text-sm text-muted-foreground">+91 98765 43210</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Documentation & Resources */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" /> Documentation
                        </CardTitle>
                        <CardDescription>
                            Browse guides and tutorials.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button variant="outline" className="w-full justify-between" asChild>
                            <a href="https://docs.beloop.io" target="_blank" rel="noopener noreferrer">
                                Knowledge Base
                                <ExternalLink className="h-4 w-4 ml-2" />
                            </a>
                        </Button>
                        <Button variant="outline" className="w-full justify-between" asChild>
                            <a href="https://youtube.com/beloop" target="_blank" rel="noopener noreferrer">
                                Video Tutorials
                                <ExternalLink className="h-4 w-4 ml-2" />
                            </a>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Ticket Section Placeholder */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TicketCheck className="h-5 w-5 text-green-600" /> Recent Tickets
                    </CardTitle>
                    <CardDescription>
                        Track the status of your support requests.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        <p>No active tickets.</p>
                        <Button variant="link" className="mt-2 text-rose-600">Raise a new ticket</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
