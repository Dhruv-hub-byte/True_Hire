import Link from "next/link"
import { Github, Linkedin, Mail, Shield } from "lucide-react"

/* =====================================================
   DATA
===================================================== */

const links = {
  product: [
    { label: "Home",        href: "/" },
    { label: "Dashboard",   href: "/dashboard" },
    { label: "Get Started", href: "/auth/register" },
  ],
  account: [
    { label: "Sign In", href: "/auth/login" },
    { label: "Sign Up", href: "/auth/register" },
  ],
  social: [
    { icon: Github,   href: "#",                        label: "GitHub" },
    { icon: Linkedin, href: "#",                        label: "LinkedIn" },
    { icon: Mail,     href: "mailto:support@truehire.com", label: "Email" },
  ],
}

/* =====================================================
   COMPONENT
   Server component — no "use client" needed
===================================================== */

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-slate-800 bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10">

          {/* Logo + about */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                <span className="text-white font-black text-sm">T</span>
              </div>
              <span className="text-white font-bold tracking-tight">TrueHire</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Secure AI-powered remote interview platform with proctoring,
              analytics, and smart candidate evaluation.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Shield className="w-3 h-3" />
              Enterprise-grade security
            </div>
          </div>

          {/* Product */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Product
            </h3>
            <div className="flex flex-col gap-2">
              {links.product.map((l) => (
                <Link
                  key={l.href + l.label}
                  href={l.href}
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Account */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Account
            </h3>
            <div className="flex flex-col gap-2">
              {links.account.map((l) => (
                <Link
                  key={l.href + l.label}
                  href={l.href}
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Connect */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Connect
            </h3>
            <div className="flex gap-3">
              {links.social.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 hover:border-slate-600 transition-colors"
                >
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <p>© {year} TrueHire. All rights reserved.</p>
          <p>Built for fair and secure hiring</p>
        </div>
      </div>
    </footer>
  )
}