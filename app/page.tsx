import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import {
  Building2,
  TrendingUp,
  Users,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  CheckCircle,
  Zap,
  Globe,
  LayoutDashboard
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { BrandApplicationForm } from "@/components/forms/BrandApplicationForm";

export default async function HomePage() {
  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-black text-white selection:bg-rose-500/30 font-sans">

      {/* Background Decor */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px] opacity-40 animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-900/20 rounded-full blur-[120px] opacity-40 animate-pulse delay-700" />
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-blue-900/10 rounded-full blur-[100px] opacity-30" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
      </div>

      {/* Navigation */}
      <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 select-none">
            {/* Logo Icon */}
            <div className="relative w-10 h-10 flex items-center justify-center bg-gradient-to-tr from-rose-600 to-orange-600 rounded-xl shadow-lg shadow-rose-500/20 group cursor-pointer hover:scale-105 transition-transform">
              <div className="absolute inset-0 bg-white/20 rounded-xl blur-[1px]"></div>
              <Building2 className="relative text-white w-6 h-6 stroke-[2.5px]" />
            </div>

            {/* Logo Text */}
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tight text-white leading-none font-sans">
                beloop<span className="text-rose-500">.</span>
              </span>
              <span className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase leading-none mt-0.5">
                Financial OS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-400">
              <Link href="#features" className="hover:text-white transition-colors">Features</Link>
              <Link href="#solutions" className="hover:text-white transition-colors">Solutions</Link>
              <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
            </nav>
            <div className="h-6 w-px bg-white/10 hidden md:block" />
            <AuthButtons />
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-32">
        {/* Hero Section */}
        <section className="container mx-auto px-6 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-medium text-gray-300 tracking-wide uppercase">System Operational v2.0</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            The Financial OS for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-purple-400 to-orange-400">
              Modern Hospitality.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            Centralize your entire restaurant operation.
            Real-time inventory, multi-outlet analytics, and automated financial auditing in one powerful console.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <Button asChild size="lg" className="h-14 px-8 text-lg bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-lg shadow-rose-600/20 transition-all hover:-translate-y-1">
              <Link href="#apply">
                Request Demo <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 px-8 text-lg border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-full backdrop-blur-sm transition-all hover:-translate-y-1">
              <Link href="/login">
                Live Preview
              </Link>
            </Button>
          </div>

          {/* Hero Dashboard Preview (Abstract) */}
          <div className="mt-20 relative mx-auto max-w-6xl animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
            <div className="absolute -inset-1 bg-gradient-to-r from-rose-500 to-purple-600 rounded-2xl blur opacity-20"></div>
            <div className="relative rounded-xl border border-white/10 bg-[#0A0A0A] shadow-2xl overflow-hidden aspect-[16/9] md:aspect-[21/9] flex items-center justify-center group">
              {/* Grid Pattern */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

              <div className="text-center z-10 p-8">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/20 to-purple-600/20 mb-4 border border-white/10 group-hover:scale-110 transition-transform duration-500">
                  <LayoutDashboard className="h-8 w-8 text-rose-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Command Center</h3>
                <p className="text-gray-500">Real-time Data Visualization</p>
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid Features */}
        <section id="features" className="container mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Everything you need. <span className="text-gray-500">Nothing you don't.</span></h2>
            <p className="text-gray-400">Engineered for speed, reliability, and financial accuracy.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 auto-rows-[300px]">
            {/* Feature 1: Large */}
            <div className="md:col-span-2 row-span-1 md:row-span-2 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 flex flex-col justify-between hover:bg-white/10 transition-colors group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity">
                <BarChart3 className="w-64 h-64 rotate-12" />
              </div>
              <div className="relative z-10">
                <div className="inline-flex p-3 rounded-xl bg-blue-500/20 text-blue-400 mb-6">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-3xl font-bold mb-4">Financial Intelligence</h3>
                <p className="text-gray-400 text-lg max-w-md">
                  Automatically reconcile cash, card, and delivery app sales.
                  View accurate P&L statements in real-time without waiting for end-of-month reports.
                </p>
              </div>
            </div>

            {/* Feature 2: Tall */}
            <div className="md:col-span-1 row-span-1 md:row-span-2 rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-8 flex flex-col items-center text-center justify-center hover:border-rose-500/30 transition-colors group">
              <div className="mb-8 relative">
                <div className="absolute inset-0 bg-rose-500 blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <Globe className="w-24 h-24 text-gray-200 relative z-10" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Centralized Protocol</h3>
              <p className="text-gray-400">
                Manage all your outlets from a single master dashboard. Push menu updates instantly.
              </p>
            </div>

            {/* Feature 3: Standard */}
            <div className="md:col-span-1 rounded-3xl border border-white/10 bg-white/5 p-8 hover:bg-white/10 transition-colors">
              <div className="inline-flex p-3 rounded-xl bg-orange-500/20 text-orange-400 mb-4">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Zero Latency</h3>
              <p className="text-gray-400 text-sm">
                Built on the edge. Pages load in milliseconds, creating a seamless experience for staff functionality.
              </p>
            </div>

            {/* Feature 4: Standard */}
            <div className="md:col-span-1 rounded-3xl border border-white/10 bg-white/5 p-8 hover:bg-white/10 transition-colors">
              <div className="inline-flex p-3 rounded-xl bg-emerald-500/20 text-emerald-400 mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Enterprise Security</h3>
              <p className="text-gray-400 text-sm">
                Role-based access control (RBAC) ensures staff only see what they need to see.
              </p>
            </div>

            {/* Feature 5: Standard */}
            <div className="md:col-span-1 rounded-3xl border border-white/10 bg-white/5 p-8 hover:bg-white/10 transition-colors">
              <div className="inline-flex p-3 rounded-xl bg-purple-500/20 text-purple-400 mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Staff Training</h3>
              <p className="text-gray-400 text-sm">
                Intuitive interfaces mean new staff can be effective in minutes, not days.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="apply" className="container mx-auto px-6 py-24">
          <div className="rounded-[3rem] bg-gradient-to-br from-gray-900 to-black border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="grid md:grid-cols-2 gap-12 p-10 md:p-20 items-center relative z-10">
              <div className="space-y-8">
                <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                  Start your transformation today.
                </h2>
                <p className="text-xl text-gray-400">
                  Join the elite group of restaurant owners who run their business with data, not guesswork.
                </p>

                <div className="space-y-4">
                  {['Free 14-day trial', 'Quick onboarding', '24/7 Priority Support'].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-gray-300">
                      <CheckCircle className="w-5 h-5 text-rose-500" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-2 shadow-2xl shadow-black/50">
                <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                  <BrandApplicationForm />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 bg-black py-12">
          <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-gray-500 text-sm">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>© 2024 Beloop Systems Inc.</span>
            </div>
            <div className="flex items-center gap-8">
              <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link href="#" className="hover:text-white transition-colors">Status</Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
