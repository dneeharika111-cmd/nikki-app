"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  AnalysisResponse,
  CrawlabilityAuditResponse,
  GeoAuditResponse,
  KeywordSuggestionResponse
} from "@/lib/types";

const sampleValues = {
  keyword: "Cold email outreach",
  brandName: "Saleshandy",
  websiteUrl: "https://www.saleshandy.com/"
};

const sidebarItems = [
  { id: "overview", label: "Dashboard", icon: "DB" },
  { id: "geo-audit", label: "GEO Audit Tool", icon: "GO" },
  { id: "content", label: "Content Research", icon: "CR" },
  { id: "crawlability", label: "AI Crawlability Check", icon: "AC" },
  { id: "reports", label: "Reports", icon: "RP" },
  { id: "competitors", label: "Competitors", icon: "CP" },
  { id: "settings", label: "Settings", icon: "ST" }
];

const recentAuditsSeed = [
  { name: "Saleshandy / Cold Outreach", engine: "ChatGPT", date: "Apr 28, 2026", score: 78 },
  { name: "NovaWrite / AI Writing", engine: "Perplexity", date: "Apr 27, 2026", score: 71 },
  { name: "Cloudlane / Demand Gen", engine: "Gemini", date: "Apr 26, 2026", score: 64 }
];

const queryIdeas = [
  "Best tools for digital marketing",
  "Top SEO platforms for B2B teams",
  "Which outreach tools are easiest to scale?",
  "What are the best AI visibility platforms?"
];

const preferredPatterns = [
  "Long-form blogs with clear subheadings",
  "Structured answers with concise takeaways",
  "Listicles and comparison pages",
  "Authority-backed pages with proof points"
];

function statusBadge(status: "covered" | "partial" | "missing") {
  if (status === "covered") {
    return { label: "Good", className: "bg-emerald-100 text-emerald-800" };
  }

  if (status === "partial") {
    return { label: "Needs Improvement", className: "bg-amber-100 text-amber-800" };
  }

  return { label: "Missing", className: "bg-rose-100 text-rose-800" };
}

function highlightBrand(answer: string, brandName: string) {
  const lowerBrand = brandName.trim().toLowerCase();
  if (!lowerBrand) {
    return [{ text: answer, match: false }];
  }

  const lowerAnswer = answer.toLowerCase();
  const parts: { text: string; match: boolean }[] = [];
  let cursor = 0;

  while (cursor < answer.length) {
    const matchIndex = lowerAnswer.indexOf(lowerBrand, cursor);

    if (matchIndex === -1) {
      parts.push({ text: answer.slice(cursor), match: false });
      break;
    }

    if (matchIndex > cursor) {
      parts.push({ text: answer.slice(cursor, matchIndex), match: false });
    }

    parts.push({
      text: answer.slice(matchIndex, matchIndex + brandName.length),
      match: true
    });
    cursor = matchIndex + brandName.length;
  }

  return parts;
}

export function AnalyzeForm() {
  const [keyword, setKeyword] = useState(sampleValues.keyword);
  const [brandName, setBrandName] = useState(sampleValues.brandName);
  const [websiteUrl, setWebsiteUrl] = useState(sampleValues.websiteUrl);
  const [aiEngine, setAiEngine] = useState("ChatGPT");
  const [geoLocation, setGeoLocation] = useState("Global");
  const [deviceType, setDeviceType] = useState("Desktop");
  const [activeSection, setActiveSection] = useState("geo-audit");
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [crawlabilityAudit, setCrawlabilityAudit] = useState<CrawlabilityAuditResponse | null>(null);
  const [geoAudit, setGeoAudit] = useState<GeoAuditResponse | null>(null);
  const [keywords, setKeywords] = useState<KeywordSuggestionResponse["keywords"]>([]);
  const [suggestionSource, setSuggestionSource] = useState<KeywordSuggestionResponse["source"] | null>(
    null
  );
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isAuditingCrawlability, setIsAuditingCrawlability] = useState(false);
  const [isAuditingGeo, setIsAuditingGeo] = useState(false);

  const avgSentimentScore = useMemo(() => {
    if (!result?.queryResults.length) {
      return 0;
    }

    const score =
      result.queryResults.reduce((total, item) => total + item.queryScore, 0) / result.queryResults.length;

    return Math.round(score);
  }, [result]);

  const sentimentLabel = avgSentimentScore >= 72 ? "Positive" : avgSentimentScore >= 46 ? "Neutral" : "Negative";

  const topPerformingQueries = result?.queryResults
    ? [...result.queryResults].sort((left, right) => right.queryScore - left.queryScore).slice(0, 3)
    : [];

  const recentAudits = useMemo(() => {
    if (!result) {
      return recentAuditsSeed;
    }

    return [
      {
        name: `${brandName} / ${keyword}`,
        engine: aiEngine,
        date: "Today",
        score: result.visibilityScore
      },
      ...recentAuditsSeed
    ];
  }, [aiEngine, brandName, keyword, result]);

  function scrollToSection(sectionId: string) {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }

  async function handleSuggestKeywords() {
    if (!websiteUrl.trim()) {
      setError("Enter a website URL first so we can extract top keywords.");
      return;
    }

    setIsSuggesting(true);
    setError("");

    try {
      const response = await fetch("/api/suggest-keywords", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          websiteUrl,
          brandName
        })
      });

      const data = (await response.json()) as KeywordSuggestionResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to extract keywords.");
      }

      setKeywords(data.keywords);
      setSuggestionSource(data.source);
      scrollToSection("content");
    } catch (suggestionError) {
      setKeywords([]);
      setSuggestionSource(null);
      setError(suggestionError instanceof Error ? suggestionError.message : "Unable to extract keywords.");
    } finally {
      setIsSuggesting(false);
    }
  }

  async function handleCrawlabilityAudit() {
    if (!websiteUrl.trim()) {
      setError("Enter a website URL first so we can audit AI crawlability.");
      return;
    }

    setIsAuditingCrawlability(true);
    setError("");

    try {
      const response = await fetch("/api/crawlability-audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ websiteUrl })
      });

      const data = (await response.json()) as CrawlabilityAuditResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to audit AI crawlability.");
      }

      setCrawlabilityAudit(data);
      scrollToSection("crawlability");
    } catch (crawlabilityError) {
      setCrawlabilityAudit(null);
      setError(
        crawlabilityError instanceof Error
          ? crawlabilityError.message
          : "Unable to audit AI crawlability."
      );
    } finally {
      setIsAuditingCrawlability(false);
    }
  }

  async function handleGeoAudit() {
    if (!websiteUrl.trim()) {
      setError("Enter a website URL first so we can audit GEO coverage.");
      return;
    }

    setIsAuditingGeo(true);
    setError("");

    try {
      const response = await fetch("/api/geo-audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          websiteUrl,
          brandName
        })
      });

      const data = (await response.json()) as GeoAuditResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to audit GEO parameters.");
      }

      setGeoAudit(data);
      scrollToSection("geo-audit");
    } catch (auditError) {
      setGeoAudit(null);
      setError(auditError instanceof Error ? auditError.message : "Unable to audit GEO parameters.");
    } finally {
      setIsAuditingGeo(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          keyword,
          brandName,
          websiteUrl,
          aiEngine,
          geoLocation,
          deviceType
        })
      });

      const data = (await response.json()) as AnalysisResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Something went wrong.");
      }

      setResult(data);
      scrollToSection("overview");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : "Unable to analyze visibility."
      );
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="glass-panel sticky top-24 h-fit border-orange-100 p-5 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">Navigation</p>
        <div className="mt-5 space-y-2">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                activeSection === item.id
                  ? "bg-orange-100 text-orange-900 ring-1 ring-orange-200"
                  : "bg-transparent text-slate-600 hover:bg-orange-50 hover:text-slate-900"
              }`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[11px] font-semibold tracking-[0.18em] text-orange-600 ring-1 ring-orange-100">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="space-y-8">
        <section className="glass-panel border-orange-100 px-6 py-5 shadow-soft sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">Post-login Dashboard</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#111111]">GeoPulse Control Center</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Audit AI visibility, research prompt opportunities, and understand how AI systems interpret your content.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button className="flex h-11 w-11 items-center justify-center rounded-full border border-orange-100 bg-white text-sm font-semibold text-slate-700">
                3
              </button>
              <div className="flex items-center gap-3 rounded-full border border-orange-100 bg-orange-50 px-3 py-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF6B00] text-sm font-semibold text-white">
                  GP
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">GeoPulse Team</p>
                  <p className="text-xs text-slate-500">Admin</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4" id="overview">
          <div className="glass-panel border-orange-100 p-5 shadow-soft">
            <p className="text-sm uppercase tracking-[0.18em] text-orange-500">GEO Visibility Score</p>
            <p className="mt-3 text-4xl font-semibold text-[#111111]">{result?.visibilityScore ?? 0}</p>
            <p className="mt-2 text-sm text-slate-600">Current AI visibility across simulated answers.</p>
          </div>
          <div className="glass-panel border-orange-100 p-5 shadow-soft">
            <p className="text-sm uppercase tracking-[0.18em] text-orange-500">Total AI Mentions</p>
            <p className="mt-3 text-4xl font-semibold text-[#111111]">{result?.brandMentions ?? 0}</p>
            <p className="mt-2 text-sm text-slate-600">How often the brand appears in response sets.</p>
          </div>
          <div className="glass-panel border-orange-100 p-5 shadow-soft">
            <p className="text-sm uppercase tracking-[0.18em] text-orange-500">Avg Sentiment Score</p>
            <p className="mt-3 text-4xl font-semibold text-[#111111]">{avgSentimentScore}</p>
            <p className="mt-2 text-sm text-slate-600">{sentimentLabel} response framing from generated outputs.</p>
          </div>
          <div className="glass-panel border-orange-100 p-5 shadow-soft">
            <p className="text-sm uppercase tracking-[0.18em] text-orange-500">Top Performing Queries</p>
            <p className="mt-3 text-4xl font-semibold text-[#111111]">{topPerformingQueries.length}</p>
            <p className="mt-2 text-sm text-slate-600">High-scoring prompts where your brand performs best.</p>
          </div>
        </section>

        <section className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="glass-panel border-orange-100 shadow-soft" id="geo-audit">
            <div className="border-b border-orange-100 px-6 py-5 sm:px-8">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">GEO Audit Tool</p>
              <h3 className="mt-3 text-2xl font-semibold text-[#111111]">Run a new GEO audit</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6 sm:px-8 sm:py-8">
              <div className="grid gap-5 lg:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Brand / Website URL
                  </span>
                  <input
                    value={websiteUrl}
                    onChange={(event) => setWebsiteUrl(event.target.value)}
                    className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder="https://www.saleshandy.com/"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Brand Name
                  </span>
                  <input
                    value={brandName}
                    onChange={(event) => setBrandName(event.target.value)}
                    className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder="Saleshandy"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Target Keywords
                  </span>
                  <input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder="Cold email outreach"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Select AI Engine
                  </span>
                  <select
                    value={aiEngine}
                    onChange={(event) => setAiEngine(event.target.value)}
                    className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    <option>ChatGPT</option>
                    <option>Gemini</option>
                    <option>Perplexity</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Geo Location
                  </span>
                  <select
                    value={geoLocation}
                    onChange={(event) => setGeoLocation(event.target.value)}
                    className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    <option>Global</option>
                    <option>United States</option>
                    <option>India</option>
                    <option>United Kingdom</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Device Type
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    {["Desktop", "Mobile"].map((device) => (
                      <button
                        key={device}
                        type="button"
                        onClick={() => setDeviceType(device)}
                        className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                          deviceType === device
                            ? "bg-orange-100 text-orange-900 ring-1 ring-orange-200"
                            : "bg-white text-slate-700 ring-1 ring-orange-100 hover:bg-orange-50"
                        }`}
                      >
                        {device}
                      </button>
                    ))}
                  </div>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={handleSuggestKeywords}
                  disabled={isSuggesting}
                  className="rounded-full border border-orange-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-orange-50 disabled:opacity-70"
                >
                  {isSuggesting ? "Finding..." : "Content Research"}
                </button>
                <button
                  type="button"
                  onClick={handleCrawlabilityAudit}
                  disabled={isAuditingCrawlability}
                  className="rounded-full border border-orange-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-orange-50 disabled:opacity-70"
                >
                  {isAuditingCrawlability ? "Checking..." : "Check Crawlability"}
                </button>
                <button
                  type="button"
                  onClick={handleGeoAudit}
                  disabled={isAuditingGeo}
                  className="rounded-full border border-orange-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-orange-50 disabled:opacity-70"
                >
                  {isAuditingGeo ? "Auditing..." : "Run GEO Score"}
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="rounded-full bg-[#FF6B00] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(255,107,0,0.24)] transition hover:bg-[#eb6200] disabled:opacity-70"
                >
                  {isLoading ? "Running..." : "Run GEO Audit"}
                </button>
              </div>

              {error ? (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </p>
              ) : null}
            </form>
          </section>

          <section className="glass-panel border-orange-100 shadow-soft" id="overview">
            <div className="border-b border-orange-100 px-6 py-5 sm:px-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">Overview</p>
                  <h3 className="mt-3 text-2xl font-semibold text-[#111111]">Recent audits and quick actions</h3>
                </div>
                <button className="rounded-full bg-[#FF6B00] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#eb6200]">
                  Run New Audit
                </button>
              </div>
            </div>

            <div className="px-6 py-6 sm:px-8 sm:py-8">
              <div className="overflow-hidden rounded-[1.75rem] border border-orange-100">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-orange-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Audit</th>
                      <th className="px-4 py-3 font-semibold">AI Engine</th>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Score</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {recentAudits.map((audit) => (
                      <tr key={`${audit.name}-${audit.date}`} className="border-t border-orange-100">
                        <td className="px-4 py-4 font-medium text-slate-900">{audit.name}</td>
                        <td className="px-4 py-4 text-slate-600">{audit.engine}</td>
                        <td className="px-4 py-4 text-slate-600">{audit.date}</td>
                        <td className="px-4 py-4">
                          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                            {audit.score}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </section>

        <section className="grid gap-8 xl:grid-cols-[1fr_1fr]">
          <section className="glass-panel border-orange-100 shadow-soft">
            <div className="border-b border-orange-100 px-6 py-5 sm:px-8">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">Results</p>
              <h3 className="mt-3 text-2xl font-semibold text-[#111111]">AI Visibility Score</h3>
            </div>

            <div className="space-y-5 px-6 py-6 sm:px-8 sm:py-8">
              <div className="rounded-[2rem] bg-[#111111] px-6 py-6 text-white">
                <p className="text-sm uppercase tracking-[0.2em] text-orange-200">GEO Score</p>
                <div className="mt-4 flex items-end gap-3">
                  <span className="text-6xl font-semibold leading-none">{result?.visibilityScore ?? 0}</span>
                  <span className="pb-2 text-lg text-orange-100">/ 100</span>
                </div>
                <p className="mt-4 text-sm leading-6 text-orange-50">AI Visibility Score</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-orange-50 p-5">
                  <p className="text-sm uppercase tracking-[0.18em] text-orange-500">AI Mentions</p>
                  <p className="mt-3 text-3xl font-semibold text-[#111111]">{result?.brandMentions ?? 0}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {result?.brandMentions ? "Brand appears in generated answers." : "No mentions detected yet."}
                  </p>
                </div>
                <div className="rounded-3xl bg-orange-50 p-5">
                  <p className="text-sm uppercase tracking-[0.18em] text-orange-500">Sentiment</p>
                  <p className="mt-3 text-3xl font-semibold text-[#111111]">{sentimentLabel}</p>
                  <p className="mt-2 text-sm text-slate-600">Average response framing based on simulated answers.</p>
                </div>
              </div>

              <div className="rounded-3xl border border-orange-100 bg-white p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">AI Mention Positions</p>
                <div className="mt-4 space-y-3">
                  {(result?.queryResults ?? []).length ? (
                    result?.queryResults.map((item, index) => {
                      const position = !item.brandMentioned ? "None" : item.queryScore >= 72 ? "Top" : "Mid";
                      return (
                        <div
                          key={item.query}
                          className="flex items-center justify-between rounded-2xl bg-orange-50 px-4 py-3"
                        >
                          <span className="text-sm font-medium text-slate-900">Prompt {index + 1}</span>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-100">
                            {position}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-500">Run an audit to inspect mention positions in AI answers.</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="glass-panel border-orange-100 shadow-soft" id="competitors">
            <div className="border-b border-orange-100 px-6 py-5 sm:px-8">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">Competitor Comparison</p>
              <h3 className="mt-3 text-2xl font-semibold text-[#111111]">Share of mention inside AI answers</h3>
            </div>

            <div className="space-y-4 px-6 py-6 sm:px-8 sm:py-8">
              <div className="rounded-[1.75rem] border border-orange-100 bg-white p-5">
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-900">{brandName || "Your Brand"}</span>
                      <span className="text-slate-600">{result?.brandMentions ?? 0}</span>
                    </div>
                    <div className="h-3 rounded-full bg-orange-100">
                      <div
                        className="h-3 rounded-full bg-[#FF6B00]"
                        style={{ width: `${Math.max(((result?.brandMentions ?? 0) / Math.max((result?.totalQueries ?? 1), 1)) * 100, 8)}%` }}
                      />
                    </div>
                  </div>

                  {(result?.competitorBrands ?? []).length ? (
                    result?.competitorBrands.map((competitor) => (
                      <div key={competitor.brand}>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-semibold text-slate-900">{competitor.brand}</span>
                          <span className="text-slate-600">{competitor.mentionCount}</span>
                        </div>
                        <div className="h-3 rounded-full bg-slate-100">
                          <div
                            className="h-3 rounded-full bg-slate-700"
                            style={{
                              width: `${Math.max((competitor.mentionCount / Math.max((result?.totalQueries ?? 1), 1)) * 100, 8)}%`
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">Competitor comparison appears after visibility analysis.</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        </section>

        <section className="grid gap-8 xl:grid-cols-[1fr_1fr]">
          <section className="glass-panel border-orange-100 shadow-soft" id="content">
            <div className="border-b border-orange-100 px-6 py-5 sm:px-8">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">Content Research</p>
              <h3 className="mt-3 text-2xl font-semibold text-[#111111]">What content patterns work in AI answers?</h3>
            </div>

            <div className="space-y-6 px-6 py-6 sm:px-8 sm:py-8">
              <div className="rounded-3xl border border-orange-100 bg-orange-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">Query Insights</p>
                <div className="mt-4 space-y-3">
                  {(keywords.length ? keywords.slice(0, 4).map((item) => item.phrase) : queryIdeas).map((query) => (
                    <div key={query} className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700 ring-1 ring-orange-100">
                      {query}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-orange-100 bg-white p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">AI Preferred Content Patterns</p>
                <div className="mt-4 space-y-3">
                  {preferredPatterns.map((pattern) => (
                    <div key={pattern} className="flex items-center gap-3 rounded-2xl bg-orange-50 px-4 py-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-semibold text-orange-600 ring-1 ring-orange-100">
                        AI
                      </span>
                      <span className="text-sm text-slate-700">{pattern}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-orange-100 bg-white p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">Top Performing Competitor Content</p>
                <div className="mt-4 space-y-3">
                  {(result?.competitorBrands ?? []).length ? (
                    result?.competitorBrands.slice(0, 3).map((competitor) => (
                      <div key={competitor.brand} className="rounded-2xl bg-orange-50 px-4 py-4">
                        <p className="font-semibold text-slate-900">{competitor.brand}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-100">
                            Frequently cited
                          </span>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-orange-100">
                            High authority
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">Run visibility analysis to see competitor content signals.</p>
                  )}
                </div>
              </div>

              <button className="rounded-full bg-[#FF6B00] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#eb6200]">
                Generate Content Ideas
              </button>
            </div>
          </section>

          <section className="glass-panel border-orange-100 shadow-soft" id="crawlability">
            <div className="border-b border-orange-100 px-6 py-5 sm:px-8">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">AI Crawlability Check</p>
              <h3 className="mt-3 text-2xl font-semibold text-[#111111]">Can AI systems access and understand your content?</h3>
            </div>

            <div className="space-y-6 px-6 py-6 sm:px-8 sm:py-8">
              <div className="rounded-[1.75rem] bg-[#111111] p-5 text-white">
                <p className="text-sm uppercase tracking-[0.2em] text-orange-200">Crawlability Status</p>
                <p className="mt-3 text-3xl font-semibold">
                  {!crawlabilityAudit
                    ? "Not Run"
                    : crawlabilityAudit.score >= 75
                      ? "Crawlable"
                      : crawlabilityAudit.score >= 45
                        ? "Limited"
                        : "Not Accessible"}
                </p>
              </div>

              <div className="rounded-3xl border border-orange-100 bg-orange-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">Issues Detected</p>
                <div className="mt-4 space-y-3">
                  {crawlabilityAudit ? (
                    crawlabilityAudit.checks
                      .filter((check) => check.status !== "covered")
                      .slice(0, 4)
                      .map((check) => (
                        <div key={check.name} className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700 ring-1 ring-orange-100">
                          {check.name}
                        </div>
                      ))
                  ) : (
                    <p className="text-sm text-slate-500">Run crawlability check to surface crawl and readability issues.</p>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-orange-100 bg-white p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">AI Readability Score</p>
                <p className="mt-3 text-4xl font-semibold text-[#111111]">{crawlabilityAudit?.score ?? 0}</p>
                <p className="mt-2 text-sm text-slate-600">How easily AI systems can fetch and interpret the page structure.</p>
              </div>

              <div className="rounded-3xl border border-orange-100 bg-white p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">Recommendations</p>
                <div className="mt-4 space-y-3">
                  {crawlabilityAudit ? (
                    crawlabilityAudit.checks
                      .filter((check) => check.status !== "covered")
                      .slice(0, 4)
                      .map((check) => (
                        <div key={check.name} className="rounded-2xl bg-orange-50 px-4 py-4">
                          <p className="font-semibold text-slate-900">{check.name}</p>
                          <p className="mt-2 text-sm leading-7 text-slate-600">{check.recommendation}</p>
                        </div>
                      ))
                  ) : (
                    <div className="rounded-2xl bg-orange-50 px-4 py-4 text-sm text-slate-600">
                      Add FAQs, improve semantic structure, increase authority signals, and add schema markup after the crawlability audit runs.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </section>

        <section className="glass-panel border-orange-100 shadow-soft" id="reports">
          <div className="border-b border-orange-100 px-6 py-5 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">Reports</p>
                <h3 className="mt-3 text-2xl font-semibold text-[#111111]">Saved audits and exports</h3>
              </div>
              <div className="flex gap-3">
                <button className="rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-orange-50">
                  Export PDF
                </button>
                <button className="rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-orange-50">
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-5 px-6 py-6 sm:px-8 sm:py-8">
            <div className="flex flex-wrap gap-3">
              <button className="rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-800">Date</button>
              <button className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-orange-100">AI Engine</button>
            </div>

            <div className="overflow-hidden rounded-[1.75rem] border border-orange-100">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-orange-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Audit</th>
                    <th className="px-4 py-3 font-semibold">Engine</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {recentAudits.map((audit) => (
                    <tr key={`${audit.name}-${audit.engine}-report`} className="border-t border-orange-100">
                      <td className="px-4 py-4 font-medium text-slate-900">{audit.name}</td>
                      <td className="px-4 py-4 text-slate-600">{audit.engine}</td>
                      <td className="px-4 py-4 text-slate-600">{audit.date}</td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                          Completed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="glass-panel border-orange-100 shadow-soft" id="settings">
          <div className="border-b border-orange-100 px-6 py-5 sm:px-8">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">Settings</p>
            <h3 className="mt-3 text-2xl font-semibold text-[#111111]">Workspace preferences</h3>
          </div>

          <div className="grid gap-5 px-6 py-6 sm:px-8 sm:py-8 lg:grid-cols-3">
            <div className="rounded-3xl bg-orange-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">Default Engine</p>
              <p className="mt-3 text-lg font-semibold text-slate-900">{aiEngine}</p>
            </div>
            <div className="rounded-3xl bg-orange-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">Default Geo</p>
              <p className="mt-3 text-lg font-semibold text-slate-900">{geoLocation}</p>
            </div>
            <div className="rounded-3xl bg-orange-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">Device View</p>
              <p className="mt-3 text-lg font-semibold text-slate-900">{deviceType}</p>
            </div>
          </div>
        </section>

        <section className="glass-panel border-orange-100 shadow-soft">
          <div className="border-b border-orange-100 px-6 py-5 sm:px-8">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">Sample AI Responses</p>
            <h3 className="mt-3 text-2xl font-semibold text-[#111111]">Generated answers with brand highlights</h3>
          </div>

          <div className="space-y-4 px-6 py-6 sm:px-8 sm:py-8">
            {(result?.queryResults ?? []).length ? (
              result?.queryResults.map((item) => (
                <article key={item.query} className="rounded-3xl border border-orange-100 bg-orange-50 p-5">
                  <p className="text-sm font-semibold text-slate-900">{item.query}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {highlightBrand(item.answer, brandName).map((part, index) =>
                      part.match ? (
                        <mark key={`${part.text}-${index}`} className="rounded bg-orange-200 px-1 py-0.5 text-[#111111]">
                          {part.text}
                        </mark>
                      ) : (
                        <span key={`${part.text}-${index}`}>{part.text}</span>
                      )
                    )}
                  </p>
                </article>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-orange-200 bg-orange-50 p-8 text-center text-slate-500">
                Run GEO Audit to generate sample AI responses and highlight brand mentions.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
