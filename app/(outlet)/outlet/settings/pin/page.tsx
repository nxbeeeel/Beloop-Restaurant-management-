"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Lock, Shield, User, AlertCircle, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/use-toast";

export default function PinManagementPage() {
    const { toast } = useToast();
    const [newPin, setNewPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [currentPin, setCurrentPin] = useState("");

    const { data: pinStatus, isLoading, refetch } = trpc.security.hasPin.useQuery();
    const { data: users, isLoading: usersLoading } = trpc.security.getUsersWithPinStatus.useQuery({});

    const setPinMutation = trpc.security.setPin.useMutation({
        onSuccess: () => {
            toast({ title: "PIN Updated", description: "Your PIN has been set successfully." });
            setNewPin("");
            setConfirmPin("");
            setCurrentPin("");
            refetch();
        },
        onError: (err) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const handleSetPin = () => {
        if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
            toast({ title: "Invalid PIN", description: "PIN must be exactly 4 digits.", variant: "destructive" });
            return;
        }
        if (newPin !== confirmPin) {
            toast({ title: "PIN Mismatch", description: "PINs do not match.", variant: "destructive" });
            return;
        }
        setPinMutation.mutate({
            newPin,
            currentPin: pinStatus?.hasPin ? currentPin : undefined,
        });
    };

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-32" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-32" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-3">
                <Lock className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold">PIN Management</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Your PIN
                        </CardTitle>
                        <CardDescription>
                            {pinStatus?.hasPin
                                ? "Update your security PIN for sensitive operations"
                                : "Set up a 4-digit PIN for secure access"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <Badge variant={pinStatus?.hasPin ? "default" : "secondary"}>
                                {pinStatus?.hasPin ? "PIN Set" : "No PIN"}
                            </Badge>
                            {pinStatus?.isLocked && (
                                <Badge variant="destructive">Locked</Badge>
                            )}
                        </div>

                        {pinStatus?.hasPin && (
                            <div>
                                <label className="text-sm font-medium">Current PIN</label>
                                <Input
                                    type="password"
                                    maxLength={4}
                                    placeholder="****"
                                    value={currentPin}
                                    onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                                    className="mt-1"
                                />
                            </div>
                        )}

                        <div>
                            <label className="text-sm font-medium">New PIN</label>
                            <Input
                                type="password"
                                maxLength={4}
                                placeholder="4 digits"
                                value={newPin}
                                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">Confirm PIN</label>
                            <Input
                                type="password"
                                maxLength={4}
                                placeholder="Confirm"
                                value={confirmPin}
                                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                                className="mt-1"
                            />
                        </div>

                        <Button
                            onClick={handleSetPin}
                            disabled={setPinMutation.isPending}
                            className="w-full"
                        >
                            {setPinMutation.isPending ? "Saving..." : pinStatus?.hasPin ? "Update PIN" : "Set PIN"}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Team PIN Status
                        </CardTitle>
                        <CardDescription>View PIN status for all team members</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {usersLoading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <Skeleton key={i} className="h-12 w-full" />
                                ))}
                            </div>
                        ) : users && users.length > 0 ? (
                            <div className="space-y-3">
                                {users.map((user) => (
                                    <div key={user.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                        <div>
                                            <p className="font-medium">{user.name}</p>
                                            <p className="text-xs text-muted-foreground">{user.role}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {user.hasPIN ? (
                                                <Badge variant="outline" className="text-green-600 border-green-200">
                                                    <Check className="h-3 w-3 mr-1" />
                                                    PIN Set
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                                                    <AlertCircle className="h-3 w-3 mr-1" />
                                                    No PIN
                                                </Badge>
                                            )}
                                            {user.isLocked && (
                                                <Badge variant="destructive">Locked</Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-center py-4">No team members found</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
