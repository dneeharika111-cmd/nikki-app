import Link from "next/link";
import { AnalyzeForm } from "@/components/analyze-form";

export default function Home() {
  return (
    <main className="relative overflow-hidden bg-[#fffaf4]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-6rem] top-10 h-56 w-56 rounded-full bg-orange-200/50 blur-3xl" />
        <div className="absolute right-[-4rem] top-32 h-72 w-72 rounded-full bg-amber-100 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-64 w-64 rounded-full bg-orange-100 blur-3xl" />
      </div>

      <section className="relative mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-10">
        <section className="mb-8 overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#1b120d_0%,#5a2b0d_55%,#ff6b00_100%)] px-6 py-10 text-white shadow-soft sm:px-10 lg:px-12">
          <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-200">
                GEO Checker
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                Understand how your brand shows up in AI-generated search journeys
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-orange-50 sm:text-lg">
                Generate AI search-style prompts, simulate answers, uncover competitor mentions,
                and audit the content signals that influence generative engine visibility.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/dashboard"
                  className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#111111] transition hover:bg-orange-50"
                >
                  Open Dashboard
                </Link>
                <Link
                  href="/login"
                  className="inline-flex rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Login
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/15 bg-white/10 p-5 backdrop-blur">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-orange-200">Visibility</p>
                  <p className="mt-2 text-3xl font-semibold">82</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-orange-200">Prompts</p>
                  <p className="mt-2 text-3xl font-semibold">38</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-orange-200">Competitors</p>
                  <p className="mt-2 text-3xl font-semibold">6</p>
                </div>
              </div>
              <div className="mt-4 rounded-[1.5rem] bg-white p-5 text-[#111111]">
                <p className="text-sm font-semibold text-orange-600">Workspace Preview</p>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  Generate AI search-style prompts, simulate answers, uncover competitor mentions,
                  and estimate visibility in one orange-and-white audit workspace.
                </p>
              </div>
            </div>
          </div>
        </section>

        <AnalyzeForm />
      </section>
    </main>
  );
}
