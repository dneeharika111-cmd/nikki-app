import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-orange-100 bg-white">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_0.8fr_0.8fr] lg:px-10">
        <div>
          <p className="text-xl font-semibold text-[#111111]">GeoPulse</p>
          <p className="mt-3 max-w-md text-sm leading-7 text-slate-600">
            GEO intelligence for the AI search era. Audit how your brand is described,
            recommended, and compared inside generative engines.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">Platform</p>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div><Link href="/features">Features</Link></div>
            <div><Link href="/products">Products</Link></div>
            <div><Link href="/dashboard">Dashboard</Link></div>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">Use Cases</p>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div><Link href="/use-cases">Marketing Teams</Link></div>
            <div><Link href="/use-cases">SEO Teams</Link></div>
            <div><Link href="/login">Login</Link></div>
          </div>
        </div>
      </div>
    </footer>
  );
}
