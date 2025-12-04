import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { Button } from "@/components/ui/button";
import { Building2, TrendingUp, Users, BarChart3, Shield, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default async function HomePage() {
  const { userId } = await auth();

  // If user is logged in, redirect based on role
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true, tenantId: true }
    });

    if (user) {
      // Redirect based on role
      if (user.role === 'SUPER') {
        redirect('/super/dashboard');
      } else if (user.role === 'BRAND_ADMIN' && user.tenantId) {
        redirect('/brand/dashboard');
      } else if (user.role === 'OUTLET_MANAGER') {
        redirect('/outlet/dashboard');
      } else if (user.role === 'STAFF' && user.tenantId) {
        redirect('/submit');
      } else {
        // User has no tenant assigned - show contact admin page
        redirect('/contact-admin');
      }
    } else {
      // User exists in Clerk but not in database (webhook hasn't fired yet)
      // This shouldn't happen with webhook, but just in case
      redirect('/contact-admin');
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-50 via-slate-50 to-slate-100 overflow-hidden">

      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-rose-200/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/30 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Header */}
      <header className="fixed w-full top-0 z-50 glass border-b-0">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 relative rounded-xl overflow-hidden shadow-lg shadow-rose-500/20 bg-white">
              <Image src="/logo.png" alt="Beloop Logo" fill className="object-contain p-1.5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Beloop
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-gray-600 hover:text-rose-600 hover:bg-rose-50">Login</Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-lg shadow-rose-500/20 rounded-full px-6">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-40 pb-20 text-center relative">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur-sm border border-rose-100 text-rose-700 rounded-full text-sm font-medium shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Shield className="w-4 h-4" />
            <span className="tracking-wide">Trusted by 100+ Restaurant Chains</span>
          </div>

          <h2 className="text-6xl md:text-7xl font-bold leading-tight tracking-tight animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            <span className="bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent">
              Master Your Finances,
            </span>
            <br />
            <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 bg-clip-text text-transparent drop-shadow-sm">
              Scale Your Brand
            </span>
          </h2>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            The all-in-one financial operating system for multi-outlet restaurants.
            Real-time tracking, automated reporting, and actionable insights.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <Link href="/signup">
              <Button size="lg" className="h-14 px-8 text-lg bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-xl shadow-rose-500/20 rounded-full transition-transform hover:scale-105">
                Start Free Trial <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-2 hover:bg-gray-50 rounded-full bg-white/50 backdrop-blur-sm">
                View Demo
              </Button>
            </Link>
          </div>

          <div className="pt-8 flex items-center justify-center gap-8 text-sm text-gray-500 animate-in fade-in duration-1000 delay-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> 30-day free trial
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> No credit card required
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: TrendingUp,
              title: "Daily Sales Tracking",
              desc: "Track cash, bank, Swiggy, Zomato sales. Auto-calculate profits and differences instantly.",
              color: "from-blue-500 to-blue-600"
            },
            {
              icon: Users,
              title: "Multi-Outlet Control",
              desc: "Manage unlimited outlets from one dashboard. Assign staff, track performance, compare profitability.",
              color: "from-green-500 to-green-600"
            },
            {
              icon: BarChart3,
              title: "Automated Reporting",
              desc: "Export to Google Sheets with one click. Professional ledger format ready for accountants.",
              color: "from-purple-500 to-purple-600"
            }
          ].map((feature, i) => (
            <div key={i} className="group glass p-8 rounded-3xl hover:-translate-y-2 transition-all duration-300 hover:shadow-2xl hover:shadow-rose-500/10">
              <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="relative rounded-[2.5rem] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-rose-600 to-pink-600" />
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />
          <div className="relative p-16 md:p-24 text-center text-white">
            <h3 className="text-4xl md:text-5xl font-bold mb-6">Ready to Transform Your Business?</h3>
            <p className="text-xl mb-10 text-rose-100 max-w-2xl mx-auto">
              Join hundreds of restaurant owners who have taken control of their finances with Beloop.
            </p>
            <Link href="/signup">
              <Button size="lg" variant="secondary" className="h-16 px-10 text-lg rounded-full shadow-2xl hover:shadow-white/20 transition-all hover:scale-105 text-rose-600 font-bold">
                Create Free Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-12 text-center text-gray-600">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-rose-500" />
            <span className="font-bold text-gray-900">Beloop</span>
          </div>
          <p className="mb-4">&copy; 2024 Beloop. All rights reserved.</p>
          <p className="text-sm text-gray-500">Built with ❤️ for restaurants, by restaurant owners.</p>
        </div>
      </footer>
    </div>
  );
}
