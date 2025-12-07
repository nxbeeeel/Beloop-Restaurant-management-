'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

const schema = z.object({
    brandName: z.string().min(1, 'Brand name is required'),
    contactName: z.string().min(1, 'Contact name is required'),
    email: z.string().email('Invalid email'),
    phone: z.string().min(10, 'Phone must be at least 10 digits'),
    estimatedOutlets: z.number().min(1, 'At least 1 outlet required'),
});

type FormValues = z.infer<typeof schema>;

interface BrandApplicationFormProps {
    className?: string;
    variant?: 'default' | 'card';
}

export function BrandApplicationForm({ className, variant = 'card' }: BrandApplicationFormProps) {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const mutation = trpc.brandApplication.submit.useMutation();

    const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            estimatedOutlets: 1
        }
    });

    const onSubmit = async (data: FormValues) => {
        try {
            await mutation.mutateAsync(data);
            setIsSubmitted(true);
            toast.success('Application submitted successfully!');
        } catch (error) {
            toast.error('Failed to submit application. Please try again.');
        }
    };

    if (isSubmitted) {
        return (
            <div className={cn("text-center space-y-4 p-8 bg-white/50 backdrop-blur-sm rounded-3xl border border-green-100 shadow-xl animate-in fade-in zoom-in-95 duration-500", className)}>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-green-700">Application Received!</h3>
                <p className="text-gray-600 max-w-sm mx-auto">
                    Thank you for your interest in Beloop. We will review your details and get back to you shortly.
                </p>
                <Button variant="outline" onClick={() => setIsSubmitted(false)} className="mt-4">
                    Submit Another
                </Button>
            </div>
        );
    }

    const FormContent = (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
            <div className="space-y-2">
                <Label htmlFor="brandName" className={cn(variant === 'default' ? "text-gray-700 font-semibold" : "")}>Brand Name</Label>
                <Input
                    id="brandName"
                    {...register('brandName')}
                    placeholder="e.g. Burger King"
                    className="bg-white/80"
                />
                {errors.brandName && <p className="text-sm text-red-500">{errors.brandName.message}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="contactName" className={cn(variant === 'default' ? "text-gray-700 font-semibold" : "")}>Contact Person</Label>
                <Input
                    id="contactName"
                    {...register('contactName')}
                    placeholder="Your Name"
                    className="bg-white/80"
                />
                {errors.contactName && <p className="text-sm text-red-500">{errors.contactName.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="email" className={cn(variant === 'default' ? "text-gray-700 font-semibold" : "")}>Email</Label>
                    <Input
                        id="email"
                        type="email"
                        {...register('email')}
                        placeholder="name@company.com"
                        className="bg-white/80"
                    />
                    {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone" className={cn(variant === 'default' ? "text-gray-700 font-semibold" : "")}>Phone</Label>
                    <Input
                        id="phone"
                        {...register('phone')}
                        placeholder="+91..."
                        className="bg-white/80"
                    />
                    {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="estimatedOutlets" className={cn(variant === 'default' ? "text-gray-700 font-semibold" : "")}>Number of Outlets</Label>
                <Input
                    id="estimatedOutlets"
                    type="number"
                    {...register('estimatedOutlets', { valueAsNumber: true })}
                    className="bg-white/80"
                />
                {errors.estimatedOutlets && <p className="text-sm text-red-500">{errors.estimatedOutlets.message}</p>}
            </div>

            <div className="pt-4">
                <Button
                    type="submit"
                    className="w-full h-12 text-lg bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-lg shadow-rose-500/20"
                    disabled={mutation.isPending}
                >
                    {mutation.isPending ? 'Submitting...' : 'Apply Now'}
                </Button>
            </div>
        </form>
    );

    if (variant === 'card') {
        return (
            <Card className={cn("w-full shadow-2xl shadow-rose-100 border-rose-100", className)}>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">Partner with Beloop</CardTitle>
                    <CardDescription>
                        Join our platform to manage your outlets efficiently.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {FormContent}
                </CardContent>
            </Card>
        );
    }

    return (
        <div className={cn("w-full", className)}>
            {FormContent}
        </div>
    );
}
