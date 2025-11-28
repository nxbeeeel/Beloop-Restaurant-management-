import { Button } from "@/components/ui/button";
import { createOutlet } from "@/server/actions/outlet";

export default function NewOutletPage() {
    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Add New Outlet</h1>

            <div className="bg-white p-6 rounded-lg shadow border">
                <form action={createOutlet} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Outlet Name</label>
                        <input
                            name="name"
                            type="text"
                            placeholder="e.g. Downtown Branch"
                            className="w-full p-2 border rounded-md"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Outlet Code</label>
                        <input
                            name="code"
                            type="text"
                            placeholder="e.g. DT01"
                            className="w-full p-2 border rounded-md"
                            required
                            maxLength={10}
                        />
                        <p className="text-xs text-gray-500 mt-1">Unique code for this outlet (max 10 chars).</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Address</label>
                        <textarea
                            name="address"
                            placeholder="Full address"
                            className="w-full p-2 border rounded-md"
                            rows={3}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Phone</label>
                        <input
                            name="phone"
                            type="tel"
                            placeholder="Contact number"
                            className="w-full p-2 border rounded-md"
                        />
                    </div>

                    <div className="pt-4">
                        <Button type="submit">Create Outlet</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
