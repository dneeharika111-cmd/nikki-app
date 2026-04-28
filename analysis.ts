import {
  AnalysisRequest,
  AnalysisResponse,
  CompetitorBrand,
  CrawlabilityAuditResponse,
  CrawlabilityCheck,
  GeoAuditResponse,
  GeoParameter,
  QueryResult,
  RankedKeyword
} from "@/lib/types";

const competitorPool = [
  "OpenAI",
  "Anthropic",
  "Perplexity",
  "Google",
  "Microsoft",
  "Adobe",
  "HubSpot",
  "Salesforce",
  "Notion",
  "Zapier"
];

function normalizeBrandName(name: string) {
  return name.trim();
}

function pickCompetitors(brandName: string) {
  const lower = brandName.toLowerCase();
  return competitorPool.filter((item) => item.toLowerCase() !== lower).slice(0, 5);
}

function createSignalSeed(value: string) {
  return value.split("").reduce((total, character, index) => {
    return total + character.charCodeAt(0) * (index + 1);
  }, 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const keywordStopWords = new Set([
  "about",
  "with",
  "your",
  "from",
  "this",
  "that",
  "have",
  "will",
  "into",
  "their",
  "them",
  "they",
  "been",
  "more",
  "most",
  "than",
  "what",
  "when",
  "where",
  "which",
  "while",
  "http",
  "https",
  "www",
  "com",
  "net",
  "org",
  "app",
  "home",
  "page",
  "site",
  "best",
  "using",
  "make",
  "build",
  "all",
  "one",
  "you",
  "our",
  "for",
  "the",
  "and",
  "are",
  "get"
]);

function extractHostTerms(websiteUrl: string) {
  try {
    const url = new URL(websiteUrl);
    return `${url.hostname} ${url.pathname}`
      .replace(/[^\w\s-]/g, " ")
      .replace(/[-_/]+/g, " ")
      .split(/\s+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 2);
  } catch {
    return websiteUrl
      .replace(/[^\w\s-]/g, " ")
      .replace(/[-_/]+/g, " ")
      .split(/\s+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 2);
  }
}

function titleCase(phrase: string) {
  return phrase
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function suggestKeywordsFromWebsite(websiteUrl: string, brandName?: string) {
  const brandTerms = (brandName ?? "")
    .toLowerCase()
    .split(/[\s-]+/)
    .map((term) => term.trim())
    .filter(Boolean);

  const fallbackKeywords: RankedKeyword[] = Array.from(
    new Set(
      extractHostTerms(websiteUrl)
        .filter((term) => !keywordStopWords.has(term.toLowerCase()))
        .filter((term) => !brandTerms.includes(term.toLowerCase()))
        .slice(0, 6)
        .map((term) => titleCase(term))
    )
  ).map((phrase, index) => ({
    phrase,
    score: clamp(72 - index * 8, 20, 72)
  }));

  const signals = await fetchWebsiteSignals(websiteUrl);

  if (!signals) {
    return {
      keywords: fallbackKeywords.length
        ? fallbackKeywords
        : [{ phrase: "Product Marketing", score: 60 }],
      source: "url-fallback" as const
    };
  }

  const weightedSources = [
    { text: signals.title, weight: 5 },
    { text: signals.metaDescription, weight: 4 },
    ...signals.headings.slice(0, 8).map((heading, index) => ({
      text: heading,
      weight: index < 2 ? 4 : 3
    }))
  ];

  const phraseScores = new Map<string, number>();

  weightedSources.forEach(({ text, weight }) => {
    const tokens = text
      .replace(/[^\w\s-]/g, " ")
      .replace(/[-_/]+/g, " ")
      .split(/\s+/)
      .map((token) => token.trim().toLowerCase())
      .filter((token) => token.length > 2 && !keywordStopWords.has(token));

    for (let size = 1; size <= 3; size += 1) {
      for (let index = 0; index <= tokens.length - size; index += 1) {
        const phraseTokens = tokens.slice(index, index + size);

        if (phraseTokens.some((token) => keywordStopWords.has(token))) {
          continue;
        }

        if (brandTerms.length && phraseTokens.every((token) => brandTerms.includes(token))) {
          continue;
        }

        const phrase = titleCase(phraseTokens.join(" "));
        const phraseWeight = weight + size * 2;
        phraseScores.set(phrase, (phraseScores.get(phrase) ?? 0) + phraseWeight);
      }
    }
  });

  const blacklistPhrases = new Set([
    "All In One",
    "All In One Cold",
    "One Cold Outreach",
    "And Better Open",
    "Open And Reply",
    "Saleshandy",
    "NovaWrite"
  ]);

  const keywords = Array.from(phraseScores.entries())
    .filter(([phrase]) => !blacklistPhrases.has(phrase))
    .filter(([phrase]) => phrase.length > 3)
    .filter(([phrase]) => {
      const tokens = phrase.toLowerCase().split(" ");
      return !brandTerms.length || !tokens.every((token) => brandTerms.includes(token));
    })
    .sort((left, right) => right[1] - left[1])
    .slice(0, 10)
    .map(([phrase, score], index) => ({
      phrase,
      score: clamp(Math.round(score * 3.4 - index * 2), 20, 99)
    }));

  return {
    keywords: keywords.length ? keywords : fallbackKeywords,
    source: keywords.length ? ("website-content" as const) : ("url-fallback" as const)
  };
}

type WebsiteSignals = {
  html: string;
  title: string;
  metaDescription: string;
  headings: string[];
  textContent: string;
};

async function fetchWebsiteSignals(websiteUrl: string): Promise<WebsiteSignals | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(websiteUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 AI Visibility Tool"
      },
      next: { revalidate: 0 }
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const title = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]?.trim() ?? "";
    const metaDescription =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["'](.*?)["']/i)?.[1]?.trim() ??
      "";
    const headings = Array.from(html.matchAll(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi))
      .map((match) => match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return {
      html,
      title,
      metaDescription,
      headings,
      textContent
    };
  } catch {
    return null;
  }
}

async function fetchPlainText(url: string) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 GEO Checker"
      },
      next: { revalidate: 0 }
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  }
}

function findMatch(text: string, patterns: string[]) {
  const lowerText = text.toLowerCase();
  return patterns.find((pattern) => lowerText.includes(pattern.toLowerCase())) ?? "";
}

function createGeoParameter(
  name: string,
  status: "covered" | "partial" | "missing",
  detail: string,
  evidence: string,
  recommendation: string
): GeoParameter {
  return {
    name,
    status,
    detail,
    evidence,
    recommendation
  };
}

function createCrawlabilityCheck(
  name: string,
  status: "covered" | "partial" | "missing",
  detail: string,
  evidence: string,
  recommendation: string
): CrawlabilityCheck {
  return {
    name,
    status,
    detail,
    evidence,
    recommendation
  };
}

export async function auditAiCrawlability(websiteUrl: string): Promise<CrawlabilityAuditResponse> {
  const signals = await fetchWebsiteSignals(websiteUrl);

  if (!signals) {
    const checks = [
      "HTTP Reachability",
      "Robots Rules",
      "Meta Robots",
      "Canonical Tag",
      "Content Depth",
      "Heading Structure",
      "Internal Links",
      "Structured Data",
      "Sitemap Discovery"
    ].map((name) =>
      createCrawlabilityCheck(
        name,
        "missing",
        "The page could not be fetched, so this crawlability signal could not be verified.",
        "No HTML response was returned from the supplied URL.",
        "Make sure the page is public, returns server-rendered HTML, and does not block basic fetching."
      )
    );

    return {
      score: 0,
      coveredCount: 0,
      partialCount: 0,
      missingCount: checks.length,
      checks
    };
  }

  const url = new URL(websiteUrl);
  const origin = url.origin;
  const robotsText = await fetchPlainText(`${origin}/robots.txt`);
  const sitemapText = robotsText && /sitemap:/i.test(robotsText) ? robotsText : await fetchPlainText(`${origin}/sitemap.xml`);

  const metaRobots =
    signals.html.match(/<meta[^>]+name=["']robots["'][^>]+content=["'](.*?)["']/i)?.[1]?.trim() ?? "";
  const canonical =
    signals.html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["'](.*?)["']/i)?.[1]?.trim() ?? "";
  const internalLinks = Array.from(signals.html.matchAll(/<a[^>]+href=["'](.*?)["']/gi))
    .map((match) => match[1])
    .filter((href) => href.startsWith("/") || href.startsWith(origin)).length;
  const textWordCount = signals.textContent.split(/\s+/).filter(Boolean).length;
  const h1Count = (signals.html.match(/<h1\b/gi) ?? []).length;
  const headingCount = signals.headings.length;
  const structuredDataPresent = /application\/ld\+json|schema\.org/i.test(signals.html);
  const blockedByRobots = /disallow:\s*\/\s*$/im.test(robotsText ?? "");
  const noIndex = /noindex/i.test(metaRobots);
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(signals.html);

  const checks: CrawlabilityCheck[] = [
    createCrawlabilityCheck(
      "HTTP Reachability",
      "covered",
      "The page returned HTML successfully, so AI crawlers have a reachable document to inspect.",
      `Fetched successfully from ${websiteUrl}`,
      "Keep important landing pages publicly reachable without login walls or client-only rendering dependencies."
    ),
    createCrawlabilityCheck(
      "Robots Rules",
      blockedByRobots ? "missing" : robotsText ? "covered" : "partial",
      blockedByRobots
        ? "The robots rules appear to block broad crawling access."
        : robotsText
          ? "A robots.txt file is present and does not obviously block the full site."
          : "No robots.txt file was detected, so crawler guidance is limited.",
      blockedByRobots
        ? "robots.txt contains a broad disallow for /"
        : robotsText
          ? "robots.txt fetched successfully"
          : "robots.txt was not found or could not be fetched.",
      blockedByRobots
        ? "Remove broad disallow rules for pages you want AI systems and search crawlers to access."
        : robotsText
          ? "Keep robots rules focused on low-value paths and make sure high-value content stays crawlable."
          : "Add a robots.txt file with clear allow/disallow guidance and a sitemap reference."
    ),
    createCrawlabilityCheck(
      "Meta Robots",
      noIndex ? "missing" : metaRobots ? "covered" : "partial",
      noIndex
        ? "The page has a noindex-style instruction, which can block downstream visibility."
        : metaRobots
          ? "A meta robots tag is present and does not appear to block indexing."
          : "No meta robots tag was found, which is usually okay but gives less explicit crawl guidance.",
      metaRobots || "No meta robots tag found.",
      noIndex
        ? "Remove noindex or nofollow directives from pages that should be discoverable."
        : metaRobots
          ? "Keep robots directives aligned with the page’s visibility intent."
          : "Optionally add a meta robots tag if you need explicit indexing control on key templates."
    ),
    createCrawlabilityCheck(
      "Canonical Tag",
      canonical ? "covered" : "partial",
      canonical
        ? "A canonical URL is present, which helps consolidating duplicate paths."
        : "No canonical tag was found, so duplicate URL variants may be harder to normalize.",
      canonical || "No canonical href found in the page HTML.",
      canonical
        ? "Keep canonical URLs self-referential and stable across important content pages."
        : "Add a canonical tag to key pages so crawlers understand the preferred URL."
    ),
    createCrawlabilityCheck(
      "Content Depth",
      textWordCount > 500 ? "covered" : textWordCount > 180 ? "partial" : "missing",
      textWordCount > 500
        ? "The page has enough text depth to give AI systems usable topical context."
        : textWordCount > 180
          ? "The page has some visible content, but it may be too thin for strong AI retrieval."
          : "The page appears thin, which can make it harder for AI crawlers to extract clear meaning.",
      `${textWordCount} visible words detected in the fetched HTML.`,
      textWordCount > 500
        ? "Keep the main copy focused on use cases, terminology, and differentiation."
        : textWordCount > 180
          ? "Expand the page with clearer product details, use cases, and buyer-oriented explanations."
          : "Add substantial visible HTML copy that explains the product, audience, and outcomes in plain language."
    ),
    createCrawlabilityCheck(
      "Heading Structure",
      h1Count === 1 && headingCount >= 3 ? "covered" : headingCount > 0 ? "partial" : "missing",
      h1Count === 1 && headingCount >= 3
        ? "The page has a solid heading structure that helps crawlers interpret content hierarchy."
        : headingCount > 0
          ? "Some headings are present, but the structure may be weak or incomplete."
          : "No meaningful heading structure was found in the fetched HTML.",
      `Detected ${h1Count} H1 tag(s) and ${headingCount} H1-H3 heading(s).`,
      h1Count === 1 && headingCount >= 3
        ? "Keep using descriptive headings that map to user questions and product themes."
        : headingCount > 0
          ? "Improve heading hierarchy with one clear H1 and supporting H2/H3 sections."
          : "Add a clear H1 and supporting section headings so page topics are easy to parse."
    ),
    createCrawlabilityCheck(
      "Internal Links",
      internalLinks >= 8 ? "covered" : internalLinks >= 3 ? "partial" : "missing",
      internalLinks >= 8
        ? "The page exposes a healthy set of internal links, which helps discovery and crawl flow."
        : internalLinks >= 3
          ? "Some internal links are present, but crawl paths could be stronger."
          : "Very few internal links were detected, which can reduce discoverability across the site.",
      `${internalLinks} internal link(s) detected in anchor tags.`,
      internalLinks >= 8
        ? "Keep linking to related product, integration, comparison, and resource pages."
        : internalLinks >= 3
          ? "Add more contextual links to adjacent pages, documentation, and deeper content."
          : "Add strong internal linking so important pages are connected and easier to crawl."
    ),
    createCrawlabilityCheck(
      "Structured Data",
      structuredDataPresent ? "covered" : "partial",
      structuredDataPresent
        ? "Structured data is present, which improves machine-readable understanding."
        : "No obvious structured data was found, so crawlers rely more heavily on raw page text.",
      structuredDataPresent ? "Detected JSON-LD or schema.org markup." : "No JSON-LD or schema.org pattern found.",
      structuredDataPresent
        ? "Maintain structured data on core templates like organization, product, FAQ, and articles."
        : "Add structured data markup to core pages to make entities and page types clearer."
    ),
    createCrawlabilityCheck(
      "Sitemap Discovery",
      sitemapText ? "covered" : robotsText ? "partial" : "missing",
      sitemapText
        ? "A sitemap signal was found, which helps crawlers discover important URLs."
        : robotsText
          ? "Robots guidance exists, but no sitemap signal was detected from the inspected fetches."
          : "No robots or sitemap signal was found during inspection.",
      sitemapText
        ? "Sitemap or sitemap reference detected."
        : robotsText
          ? "robots.txt present, but no sitemap reference was detected."
          : "No robots.txt or sitemap response detected.",
      sitemapText
        ? "Keep the sitemap updated with canonical, crawlable URLs."
        : robotsText
          ? "Add a sitemap reference to robots.txt and make sure sitemap.xml is available."
          : "Publish robots.txt and sitemap.xml so crawlers can discover key URLs more reliably."
    ),
    createCrawlabilityCheck(
      "Render Compatibility",
      hasViewport ? "covered" : "partial",
      hasViewport
        ? "The page includes basic mobile/render metadata, which usually supports broader crawler rendering compatibility."
        : "The page is missing a viewport meta tag, which can hint at weaker template hygiene.",
      hasViewport ? "Viewport meta tag detected." : "Viewport meta tag not found.",
      hasViewport
        ? "Keep templates lightweight and server-rendered where possible."
        : "Add basic document metadata and favor accessible server-rendered HTML for critical content."
    )
  ];

  const coveredCount = checks.filter((check) => check.status === "covered").length;
  const partialCount = checks.filter((check) => check.status === "partial").length;
  const missingCount = checks.filter((check) => check.status === "missing").length;
  const score = clamp(Math.round(((coveredCount + partialCount * 0.5) / checks.length) * 100), 0, 100);

  return {
    score,
    coveredCount,
    partialCount,
    missingCount,
    checks
  };
}

export async function auditGeoParameters(websiteUrl: string, brandName?: string): Promise<GeoAuditResponse> {
  const signals = await fetchWebsiteSignals(websiteUrl);

  if (!signals) {
    const unavailableParameters = [
      "Metadata Quality",
      "Structured Data",
      "FAQ / Q&A Content",
      "Comparison Content",
      "Pricing Clarity",
      "Trust Signals",
      "Integration Depth",
      "Educational Content"
    ].map((name) =>
      createGeoParameter(
        name,
        "missing",
        "We could not inspect the website content, so this signal could not be verified.",
        "No crawlable page content was returned from the provided URL.",
        "Make sure the page is publicly accessible, crawlable, and returns enough HTML content for inspection."
      )
    );

    return {
      score: 0,
      coveredCount: 0,
      partialCount: 0,
      missingCount: unavailableParameters.length,
      parameters: unavailableParameters
    };
  }

  const searchableText = [signals.title, signals.metaDescription, ...signals.headings, signals.textContent]
    .join(" ")
    .replace(/\s+/g, " ");
  const brandMention = brandName ? findMatch(searchableText, [brandName]) : "";
  const metadataLength = signals.title.length + signals.metaDescription.length;
  const hasStructuredData = /application\/ld\+json|schema\.org/i.test(signals.html);
  const faqMatch = findMatch(searchableText, [
    "faq",
    "frequently asked questions",
    "question",
    "answer"
  ]);
  const comparisonMatch = findMatch(searchableText, ["vs", "compare", "alternative", "competitor"]);
  const pricingMatch = findMatch(searchableText, ["pricing", "plans", "book demo", "free trial"]);
  const trustMatch = findMatch(searchableText, [
    "customer",
    "testimonial",
    "trusted by",
    "g2",
    "review",
    "case study"
  ]);
  const integrationMatch = findMatch(searchableText, [
    "integration",
    "api",
    "connect",
    "works with",
    "platform"
  ]);
  const educationMatch = findMatch(searchableText, [
    "guide",
    "blog",
    "resources",
    "learn",
    "documentation"
  ]);
  const freshnessMatch = findMatch(searchableText, ["2026", "2025", "updated", "latest", "new"]);

  const parameters: GeoParameter[] = [
    createGeoParameter(
      "Metadata Quality",
      metadataLength > 80 ? "covered" : metadataLength > 20 ? "partial" : "missing",
      metadataLength > 80
        ? "The page has enough title and meta description content for AI systems to understand page intent."
        : metadataLength > 20
          ? "Some metadata exists, but it may not be descriptive enough for strong AI retrieval."
          : "Title and meta description signals are weak or missing.",
      `Title: ${signals.title || "missing"} | Description: ${signals.metaDescription || "missing"}`,
      metadataLength > 80
        ? "Keep title and description aligned with your core category and major buyer intent queries."
        : metadataLength > 20
          ? "Expand the page title and meta description to clearly mention the product category, audience, and core outcome."
          : "Add a descriptive title and meta description that explain what the page offers and who it serves."
    ),
    createGeoParameter(
      "Structured Data",
      hasStructuredData ? "covered" : "missing",
      hasStructuredData
        ? "Structured data was detected, which helps machine-readable understanding."
        : "No visible structured data marker was detected in the HTML.",
      hasStructuredData ? "Detected JSON-LD or schema.org markup." : "No JSON-LD or schema.org pattern found.",
      hasStructuredData
        ? "Maintain schema coverage for key pages like product, FAQ, organization, and article content."
        : "Add JSON-LD schema for organization, product, FAQ, and articles so AI systems can parse your content more reliably."
    ),
    createGeoParameter(
      "FAQ / Q&A Content",
      faqMatch ? "covered" : "missing",
      faqMatch
        ? "The site includes question-style content that can map well to AI answer generation."
        : "No obvious FAQ or question-answer phrasing was found.",
      faqMatch || "No FAQ-related phrase found in inspected content.",
      faqMatch
        ? "Keep expanding question-based content around use cases, objections, and implementation details."
        : "Add an FAQ section answering common buyer questions, product fit questions, and setup questions in plain language."
    ),
    createGeoParameter(
      "Comparison Content",
      comparisonMatch ? "covered" : "partial",
      comparisonMatch
        ? "The site appears to include comparison or alternative-style language, which helps AI assistants cite you in competitive prompts."
        : "No direct competitor comparison language was found, so you may be missing competitive retrieval opportunities.",
      comparisonMatch || "No clear compare/vs/alternative phrasing found.",
      comparisonMatch
        ? "Strengthen competitive pages with clear positioning, differentiators, and alternative comparisons."
        : "Create comparison and alternative pages like 'X vs Y' or 'best alternatives' so your brand appears in competitive AI prompts."
    ),
    createGeoParameter(
      "Pricing Clarity",
      pricingMatch ? "covered" : "partial",
      pricingMatch
        ? "Pricing or conversion intent is visible, helping AI systems understand commercial readiness."
        : "Commercial intent is not very visible from the inspected content.",
      pricingMatch || "No pricing, plan, demo, or trial phrase found.",
      pricingMatch
        ? "Keep plan details easy to parse and connect pricing with ideal customer segments or use cases."
        : "Add clear pricing, plan, trial, or demo language so commercial intent is obvious to both users and AI systems."
    ),
    createGeoParameter(
      "Trust Signals",
      trustMatch ? "covered" : "partial",
      trustMatch
        ? "The page includes customer proof or reputation signals that support answer credibility."
        : "Trust and proof signals were not prominent in the inspected content.",
      trustMatch || "No testimonial, trusted-by, review, or case study phrase found.",
      trustMatch
        ? "Keep proof points updated with recognizable customers, outcomes, reviews, and case studies."
        : "Add testimonials, customer logos, review references, and case studies to improve brand credibility."
    ),
    createGeoParameter(
      "Integration Depth",
      integrationMatch ? "covered" : "partial",
      integrationMatch
        ? "Integrations or API language is present, which often improves relevance for product recommendation prompts."
        : "Integration or ecosystem positioning is not clearly surfaced.",
      integrationMatch || "No integration, API, or works-with phrase found.",
      integrationMatch
        ? "Highlight your strongest integrations with dedicated pages or use-case examples."
        : "Add integration, API, and ecosystem pages so AI systems understand how your product fits existing workflows."
    ),
    createGeoParameter(
      "Educational Content",
      educationMatch ? "covered" : "partial",
      educationMatch
        ? "Helpful educational or documentation-style content is present and can increase topical authority."
        : "The inspected content did not strongly highlight guides, docs, or learning resources.",
      educationMatch || "No guide, blog, resources, learn, or documentation phrase found.",
      educationMatch
        ? "Keep publishing use-case guides, templates, and documentation that build topical authority."
        : "Add blogs, guides, templates, and documentation targeting the exact problems your buyers search for."
    ),
    createGeoParameter(
      "Brand Visibility",
      brandMention ? "covered" : "partial",
      brandMention
        ? "The supplied brand name appears in the inspected page content."
        : "The brand name was not clearly found in the inspected content, which can weaken entity recognition.",
      brandMention || "Brand name match was not detected in the fetched page content.",
      brandMention
        ? "Keep the brand entity consistent across titles, headings, page copy, and structured data."
        : "Repeat the brand name clearly in the title, hero copy, headings, and organization schema to strengthen entity recognition."
    ),
    createGeoParameter(
      "Content Freshness Signals",
      freshnessMatch ? "covered" : "partial",
      freshnessMatch
        ? "The page includes freshness language that can help with current-answer relevance."
        : "Few freshness cues were detected, so AI systems may treat the page as more evergreen than current.",
      freshnessMatch || "No visible updated/latest/year-based phrase found.",
      freshnessMatch
        ? "Keep freshness signals honest by updating content dates, benchmarks, and current-year comparisons when content changes."
        : "Add updated dates, current-year references, or freshness cues on important pages where recency matters."
    )
  ];

  const coveredCount = parameters.filter((parameter) => parameter.status === "covered").length;
  const partialCount = parameters.filter((parameter) => parameter.status === "partial").length;
  const missingCount = parameters.filter((parameter) => parameter.status === "missing").length;
  const score = clamp(Math.round(((coveredCount + partialCount * 0.5) / parameters.length) * 100), 0, 100);

  return {
    score,
    coveredCount,
    partialCount,
    missingCount,
    parameters
  };
}

export function generateQueries({ keyword, brandName, websiteUrl }: AnalysisRequest) {
  const host = websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return [
    `What are the best ${keyword} solutions for teams in 2026?`,
    `Compare ${brandName} with other ${keyword} platforms.`,
    `Which ${keyword} tools are most recommended by AI assistants?`,
    `Find trusted ${keyword} providers with strong product visibility.`,
    `Should I choose ${brandName} or a competitor for ${keyword}?`,
    `What does ${host} offer for ${keyword} use cases?`
  ];
}

function buildAnswer(
  query: string,
  brandName: string,
  keyword: string,
  competitors: string[],
  index: number,
  includeBrand: boolean
) {
  const featuredCompetitor = competitors[index % competitors.length];
  const secondaryCompetitor = competitors[(index + 1) % competitors.length];

  const parts = [
    `${query} Buyers often evaluate ${featuredCompetitor} and ${secondaryCompetitor} for breadth, integrations, and ease of rollout.`,
    `${brandName} is frequently discussed for ${keyword} when teams want focused execution, faster onboarding, and a clearer workflow.`,
    `A balanced shortlist usually includes ${brandName}, ${featuredCompetitor}, and ${secondaryCompetitor}, depending on budget and maturity.`,
    `${featuredCompetitor} still appears often in AI-generated recommendations because of market presence and wide ecosystem support.`
  ];

  if (!includeBrand) {
    return `${query} Common AI recommendations include ${featuredCompetitor}, ${secondaryCompetitor}, and broader enterprise platforms for ${keyword}.`;
  }

  return parts[index % parts.length];
}

function extractMentions(answer: string, brandName: string, competitors: string[]) {
  const allBrands = [brandName, ...competitors];
  return allBrands.filter((brand) => {
    const expression = new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    return expression.test(answer);
  });
}

export function analyzeVisibility(input: AnalysisRequest): AnalysisResponse {
  const brandName = normalizeBrandName(input.brandName);
  const competitors = pickCompetitors(brandName);
  const generatedQueries = generateQueries(input);
  const seedSource = `${input.keyword}|${brandName}|${input.websiteUrl}`;
  const signalSeed = createSignalSeed(seedSource);
  const brandBias = signalSeed % 100;

  const queryResults: QueryResult[] = generatedQueries.map((query, index) => {
    const querySeed = createSignalSeed(`${query}|${brandName}|${index}`) + brandBias;
    const includeBrand = querySeed % 100 >= 28;
    const answer = buildAnswer(query, brandName, input.keyword, competitors, index, includeBrand);
    const mentions = extractMentions(answer, brandName, competitors);
    const brandMentioned = mentions.some((mention) => mention.toLowerCase() === brandName.toLowerCase());
    const competitorMentions = mentions.filter(
      (mention) => mention.toLowerCase() !== brandName.toLowerCase()
    );
    const queryScore = clamp(
      Math.round((brandMentioned ? 62 : 24) + (querySeed % 21) - competitorMentions.length * 6),
      12,
      96
    );

    return {
      query,
      answer,
      mentions,
      brandMentioned,
      competitorMentions,
      queryScore
    };
  });

  const brandMentions = queryResults.filter((result) => result.brandMentioned).length;
  const competitorMentions = queryResults.reduce(
    (total, result) => total + result.competitorMentions.length,
    0
  );

  const competitorCounts = new Map<string, number>();

  queryResults.forEach((result) => {
    result.competitorMentions.forEach((mention) => {
      if (mention.toLowerCase() !== brandName.toLowerCase()) {
        competitorCounts.set(mention, (competitorCounts.get(mention) ?? 0) + 1);
      }
    });
  });

  const competitorBrands: CompetitorBrand[] = Array.from(competitorCounts.entries())
    .map(([brand, mentionCount]) => ({ brand, mentionCount }))
    .sort((left, right) => right.mentionCount - left.mentionCount)
    .slice(0, 5);

  const averageQueryScore =
    queryResults.reduce((total, result) => total + result.queryScore, 0) / generatedQueries.length;
  const shareOfVoice = brandMentions / (brandMentions + competitorMentions || 1);
  const visibilityScore = clamp(
    Math.round(averageQueryScore * 0.65 + shareOfVoice * 35),
    0,
    100
  );

  return {
    visibilityScore,
    brandMentions,
    competitorMentions,
    totalQueries: generatedQueries.length,
    generatedQueries,
    queryResults,
    competitorBrands
  };
}
