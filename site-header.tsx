import Link from "next/link";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/products", label: "Products" },
  { href: "/use-cases", label: "Use Cases" }
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-orange-100/80 bg-white/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#111111] text-lg font-semibold text-white shadow-soft">
            G
          </span>
          <div>
            <p className="text-lg font-semibold tracking-tight text-[#111111]">GeoPulse</p>
            <p className="text-xs uppercase tracking-[0.28em] text-orange-500">GEO Intelligence</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-slate-700 transition hover:text-orange-600"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-orange-50 sm:inline-flex"
          >
            Login
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex rounded-full bg-[#FF6B00] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(255,107,0,0.28)] transition hover:bg-[#eb6200]"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
