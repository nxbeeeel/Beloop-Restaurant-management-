"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, MessageSquare, Smartphone, Check, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/use-toast";
import { useState, useEffect } from "react";

export default function NotificationsPage() {
    const { toast } = useToast();
    const utils = trpc.useUtils();

    const { data: settings, isLoading } = trpc.security.getSettings.useQuery({});
    const { data: notifications } = trpc.security.getNotifications.useQuery({ unreadOnly: false, limit: 20 });

    const [notifySettings, setNotifySettings] = useState({
        notifyOnEdit: true,
        notifyOnVoid: true,
        notifyOnWithdrawal: true,
        notifyOnVariance: true,
    });

    useEffect(() => {
        if (settings) {
            setNotifySettings({
                notifyOnEdit: settings.notifyOnEdit ?? true,
                notifyOnVoid: settings.notifyOnVoid ?? true,
                notifyOnWithdrawal: settings.notifyOnWithdrawal ?? true,
                notifyOnVariance: settings.notifyOnVariance ?? true,
            });
        }
    }, [settings]);

    const updateMutation = trpc.security.updateSettings.useMutation({
        onSuccess: () => {
            toast({ title: "Settings Saved", description: "Notification preferences updated." });
            utils.security.getSettings.invalidate();
        },
        onError: (err) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const markReadMutation = trpc.security.markNotificationsRead.useMutation({
        onSuccess: () => {
            utils.security.getNotifications.invalidate();
        },
    });

    const handleSave = () => {
        if (!settings?.outletId) return;
        updateMutation.mutate({
            outletId: settings.outletId,
            ...notifySettings,
        });
    };

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-40" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex justify-between">
                                    <Skeleton className="h-4 w-48" />
                                    <Skeleton className="h-6 w-12" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    const notifyOptions = [
        { key: "notifyOnEdit", label: "Order Edits", desc: "Get notified when orders are modified", icon: Mail },
        { key: "notifyOnVoid", label: "Voided Orders", desc: "Get notified when orders are voided", icon: X },
        { key: "notifyOnWithdrawal", label: "Cash Withdrawals", desc: "Get notified for cash withdrawals", icon: Smartphone },
        { key: "notifyOnVariance", label: "Cash Variance", desc: "Get notified for closing variances", icon: Bell },
    ];

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Bell className="h-8 w-8 text-primary" />
                    <h1 className="text-2xl font-bold">Notifications</h1>
                </div>
                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Saving..." : "Save Preferences"}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Notification Preferences</CardTitle>
                        <CardDescription>Choose what notifications you want to receive</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {notifyOptions.map((option) => (
                            <div key={option.key} className="flex justify-between items-center py-2 border-b last:border-0">
                                <div className="flex items-center gap-3">
                                    <option.icon className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="font-medium">{option.label}</p>
                                        <p className="text-sm text-muted-foreground">{option.desc}</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={notifySettings[option.key as keyof typeof notifySettings]}
                                    onCheckedChange={(checked: boolean) =>
                                        setNotifySettings((prev) => ({ ...prev, [option.key]: checked }))
                                    }
                                />
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Recent Notifications</CardTitle>
                                <CardDescription>Your latest alerts and updates</CardDescription>
                            </div>
                            {notifications?.unreadCount && notifications.unreadCount > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => markReadMutation.mutate({ markAll: true })}
                                >
                                    Mark All Read
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {notifications?.notifications && notifications.notifications.length > 0 ? (
                            <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                {notifications.notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        className={`p-3 rounded-lg border ${notif.isRead ? "bg-muted/30" : "bg-blue-50 border-blue-200"}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-medium text-sm">{notif.title}</p>
                                                <p className="text-xs text-muted-foreground mt-1">{notif.message}</p>
                                            </div>
                                            {!notif.isRead && (
                                                <Badge variant="secondary" className="text-xs">New</Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            {new Date(notif.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                <p>No notifications yet</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
