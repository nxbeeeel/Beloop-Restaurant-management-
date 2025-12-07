
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

const schema = z.object({
    brandName: z.string().min(1, 'Brand name is required'),
    contactName: z.string().min(1, 'Contact name is required'),
    email: z.string().email('Invalid email'),
    phone: z.string().min(10, 'Phone must be at least 10 digits'),
    estimatedOutlets: z.number().min(1, 'At least 1 outlet required'),
});

type FormValues = z.infer<typeof schema>;

export default function BrandApplicationPage() {
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
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-center text-green-600">Application Received!</CardTitle>
                        <CardDescription className="text-center">
                            Thank you for applying. We will review your application and get back to you shortly.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Button variant="outline" onClick={() => setIsSubmitted(false)}>Submit Another</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle>Partner with Beloop</CardTitle>
                    <CardDescription>
                        Join our platform to manage your outlets efficiently. Fill out the form below to get started.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="brandName">Brand Name</Label>
                            <Input id="brandName" {...register('brandName')} placeholder="e.g. Burger King" />
                            {errors.brandName && <p className="text-sm text-red-500">{errors.brandName.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="contactName">Contact Person</Label>
                            <Input id="contactName" {...register('contactName')} placeholder="Your Name" />
                            {errors.contactName && <p className="text-sm text-red-500">{errors.contactName.message}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" {...register('email')} placeholder="name@company.com" />
                                {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input id="phone" {...register('phone')} placeholder="+91..." />
                                {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="estimatedOutlets">Number of Outlets</Label>
                            <Input
                                id="estimatedOutlets"
                                type="number"
                                {...register('estimatedOutlets', { valueAsNumber: true })}
                            />
                            {errors.estimatedOutlets && <p className="text-sm text-red-500">{errors.estimatedOutlets.message}</p>}
                        </div>

                        <div className="pt-4">
                            <Button type="submit" className="w-full" disabled={mutation.isPending}>
                                {mutation.isPending ? 'Submitting...' : 'Submit Application'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
