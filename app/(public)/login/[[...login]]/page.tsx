import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-black relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px] opacity-40 animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-900/20 rounded-full blur-[120px] opacity-40 animate-pulse delay-700" />
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
            </div>

            <div className="z-10 animate-in fade-in zoom-in duration-500">
                <SignIn
                    appearance={{
                        elements: {
                            card: "shadow-2xl shadow-rose-500/10 border border-white/10 bg-white/5 backdrop-blur-xl",
                            headerTitle: "text-white",
                            headerSubtitle: "text-gray-400",
                            socialButtonsBlockButton: "text-white border-white/10 hover:bg-white/5",
                            dividerLine: "bg-white/10",
                            dividerText: "text-gray-400",
                            formFieldLabel: "text-gray-300",
                            formFieldInput: "bg-black/20 border-white/10 text-white placeholder:text-gray-500",
                            footerActionText: "text-gray-400",
                            footerActionLink: "text-rose-400 hover:text-rose-300"
                        }
                    }}
                />
            </div>
        </div>
    );
}
