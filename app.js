const sidebarItems = [
  { id: "overview", label: "Dashboard", icon: "DB" },
  { id: "geo-audit", label: "GEO Audit Tool", icon: "GO" },
  { id: "content", label: "Content Research", icon: "CR" },
  { id: "crawlability", label: "AI Crawlability Check", icon: "AC" },
  { id: "reports", label: "Reports", icon: "RP" },
  { id: "competitors", label: "Competitors", icon: "CP" },
  { id: "settings", label: "Settings", icon: "ST" }
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

const recentAuditsSeed = [
  { name: "Saleshandy / Cold Outreach", engine: "ChatGPT", date: "Apr 28, 2026", score: 78 },
  { name: "NovaWrite / AI Writing", engine: "Perplexity", date: "Apr 27, 2026", score: 71 },
  { name: "Cloudlane / Demand Gen", engine: "Gemini", date: "Apr 26, 2026", score: 64 }
];

function normalize(input) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function titleCase(input) {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getCompetitorPool(keyword, brandName) {
  const basePool = [
    "HubSpot",
    "Apollo",
    "Outreach",
    "Lemlist",
    "Mailshake",
    "Ahrefs",
    "Semrush",
    "Writesonic",
    "Clay",
    "Reply.io"
  ];

  return basePool.filter((brand) => normalize(brand) !== normalize(brandName)).slice(0, 5);
}

function buildQueries(keyword, brandName, aiEngine, geoLocation, deviceType) {
  return [
    `What are the best ${keyword} platforms in ${geoLocation}?`,
    `Which ${keyword} tools does ${aiEngine} recommend for ${deviceType.toLowerCase()} users?`,
    `Compare ${brandName} with competitors for ${keyword}.`,
    `What brands are most visible for ${keyword} right now?`
  ];
}

function suggestKeywords(url, brandName) {
  const tokens = `${url} ${brandName}`
    .replace(/https?:\/\//g, "")
    .replace(/www\./g, "")
    .replace(/[^\w/.-]+/g, " ")
    .split(/[./\s-]+/)
    .filter((token) => token.length > 3);

  const unique = [...new Set(tokens)].slice(0, 4);
  const phrases = unique.length
    ? unique.map((token, index) => ({
        phrase: `${titleCase(token)} ${index % 2 === 0 ? "Platform" : "Strategy"}`.trim(),
        score: 92 - index * 9
      }))
    : queryIdeas.map((query, index) => ({
        phrase: query,
        score: 88 - index * 7
      }));

  return phrases;
}

function runVisibilityAudit({ keyword, brandName, websiteUrl, aiEngine, geoLocation, deviceType }) {
  const competitors = getCompetitorPool(keyword, brandName);
  const queries = buildQueries(keyword, brandName, aiEngine, geoLocation, deviceType);
  const keywordStrength = Math.min(18, normalize(keyword).split(" ").filter(Boolean).length * 5);
  const brandStrength = Math.min(16, brandName.length);
  const urlStrength = websiteUrl.includes("https://") ? 7 : 3;
  let brandMentions = 0;
  let competitorMentions = 0;

  const queryResults = queries.map((query, index) => {
    const brandMentioned = index !== 2 || brandName.length > 5;
    const queryCompetitors = competitors.slice(index % 2, index % 2 + 2);
    const queryScore = Math.min(
      96,
      44 + keywordStrength + brandStrength + urlStrength - index * 4 + (brandMentioned ? 12 : -8)
    );
    const answer = brandMentioned
      ? `${brandName} is frequently mentioned for ${keyword} thanks to focused workflows, solid positioning, and clear onboarding. ${queryCompetitors.join(" and ")} also appear in AI answers when users ask for alternatives.`
      : `${queryCompetitors.join(" and ")} are often recommended for ${keyword}, especially when buyers want comparison-led options and stronger authority pages.`;

    if (brandMentioned) {
      brandMentions += 1;
    }

    competitorMentions += queryCompetitors.length;

    return {
      query,
      answer,
      brandMentioned,
      queryScore,
      competitorMentions: queryCompetitors
    };
  });

  const competitorBrands = competitors.map((brand, index) => ({
    brand,
    mentionCount: Math.max(1, 4 - index)
  }));

  const visibilityScore = Math.max(
    38,
    Math.min(
      94,
      Math.round(
        queryResults.reduce((total, item) => total + item.queryScore, 0) / queryResults.length * 0.72 +
          (brandMentions / queryResults.length) * 28
      )
    )
  );

  return {
    visibilityScore,
    brandMentions,
    totalQueries: queryResults.length,
    competitorMentions,
    competitorBrands,
    queryResults
  };
}

function runGeoAudit(brandName) {
  const checks = [
    {
      name: "Metadata Quality",
      status: "covered",
      evidence: `${brandName} uses distinct page naming and benefit-led positioning.`,
      recommendation: "Keep title and description patterns aligned to category intent."
    },
    {
      name: "Structured Data",
      status: "partial",
      evidence: "Some entity clarity exists, but markup coverage feels incomplete.",
      recommendation: "Add Organization, FAQ, Breadcrumb, and Product schema where relevant."
    },
    {
      name: "FAQ / Q&A Content",
      status: "partial",
      evidence: "The site answers some questions, but not enough AI-style conversational queries.",
      recommendation: "Add dedicated FAQ sections tied to decision-stage prompts."
    },
    {
      name: "Comparison Content",
      status: "missing",
      evidence: "No strong competitor-vs-brand comparison assets are surfaced in this sample audit.",
      recommendation: "Publish comparison pages that explain differences, fit, and tradeoffs."
    },
    {
      name: "Pricing Clarity",
      status: "covered",
      evidence: "Commercial intent is supported when pricing or demo pathways are visible.",
      recommendation: "Keep pricing, trials, and demo CTAs easy to parse."
    },
    {
      name: "Trust Signals",
      status: "partial",
      evidence: "Some proof points exist, but authority signals could be stronger.",
      recommendation: "Add testimonials, case studies, review badges, and quantified outcomes."
    }
  ];

  const score = Math.round(
    checks.reduce((total, check) => {
      if (check.status === "covered") return total + 16;
      if (check.status === "partial") return total + 10;
      return total + 4;
    }, 0)
  );

  return { score, checks };
}

function runCrawlabilityAudit() {
  const checks = [
    {
      name: "HTTP Reachability",
      status: "covered",
      recommendation: "Keep key landing pages accessible without login walls."
    },
    {
      name: "Robots & Meta Directives",
      status: "partial",
      recommendation: "Audit indexability and ensure important pages are not blocked."
    },
    {
      name: "Heading Structure",
      status: "covered",
      recommendation: "Preserve a clear H1-H3 hierarchy for answer extraction."
    },
    {
      name: "Structured Data",
      status: "partial",
      recommendation: "Expand schema coverage for FAQs, comparisons, and organization data."
    },
    {
      name: "Authority Signals",
      status: "missing",
      recommendation: "Add citations, named authors, and stronger trust signals."
    }
  ];

  const score = 68;
  return { score, checks };
}

function highlightBrand(text, brandName) {
  const regex = new RegExp(`(${brandName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}

function renderSidebar() {
  const nav = document.querySelector("[data-sidebar-nav]");
  if (!nav) return;

  nav.innerHTML = sidebarItems
    .map(
      (item, index) => `
        <a class="sidebar-link ${index === 1 ? "active" : ""}" href="#${item.id}">
          <span class="sidebar-badge">${item.icon}</span>
          <span>${item.label}</span>
        </a>
      `
    )
    .join("");
}

function renderReportsTable(audits) {
  const target = document.querySelector("[data-reports-body]");
  if (!target) return;

  target.innerHTML = audits
    .map(
      (audit) => `
        <tr>
          <td>${audit.name}</td>
          <td>${audit.engine}</td>
          <td>${audit.date}</td>
          <td><span class="badge good">Completed</span></td>
        </tr>
      `
    )
    .join("");
}

function renderQueryIdeas(items) {
  const target = document.querySelector("[data-query-insights]");
  if (!target) return;

  target.innerHTML = items
    .map(
      (item) => `
        <div class="query-chip">
          <strong>${typeof item === "string" ? item : item.phrase}</strong>
          ${typeof item === "string" ? "" : `<div style="margin-top:8px;color:#5b6472;font-size:.92rem;">Rated keyword score: ${item.score}</div>`}
        </div>
      `
    )
    .join("");
}

function renderPreferredPatterns() {
  const target = document.querySelector("[data-patterns]");
  if (!target) return;

  target.innerHTML = preferredPatterns
    .map(
      (pattern) => `
        <div class="list-item">
          <strong>${pattern}</strong>
        </div>
      `
    )
    .join("");
}

function renderGeoAudit(geoAudit) {
  const scoreTarget = document.querySelector("[data-geo-score]");
  const checksTarget = document.querySelector("[data-geo-checks]");
  if (!scoreTarget || !checksTarget) return;

  scoreTarget.textContent = String(geoAudit.score);
  checksTarget.innerHTML = geoAudit.checks
    .map((check) => {
      const badgeClass =
        check.status === "covered" ? "good" : check.status === "partial" ? "partial" : "missing";
      const badgeText =
        check.status === "covered"
          ? "Good"
          : check.status === "partial"
            ? "Needs Improvement"
            : "Missing";

      return `
        <div class="response-card">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
            <div>
              <strong>${check.name}</strong>
              <p style="margin:10px 0 0;color:#5b6472;line-height:1.7;">${check.evidence}</p>
            </div>
            <span class="badge ${badgeClass}">${badgeText}</span>
          </div>
          <p style="margin:14px 0 0;color:#111111;"><strong>What To Add:</strong> ${check.recommendation}</p>
        </div>
      `;
    })
    .join("");
}

function renderCrawlability(audit) {
  const statusTarget = document.querySelector("[data-crawl-status]");
  const scoreTarget = document.querySelector("[data-crawl-score]");
  const issuesTarget = document.querySelector("[data-crawl-issues]");
  const recommendationsTarget = document.querySelector("[data-crawl-recommendations]");
  if (!statusTarget || !scoreTarget || !issuesTarget || !recommendationsTarget) return;

  statusTarget.textContent = audit.score >= 75 ? "Crawlable" : audit.score >= 45 ? "Limited" : "Not Accessible";
  scoreTarget.textContent = String(audit.score);

  const issues = audit.checks.filter((item) => item.status !== "covered");

  issuesTarget.innerHTML = issues
    .map((item) => `<div class="list-item">${item.name}</div>`)
    .join("");

  recommendationsTarget.innerHTML = issues
    .map(
      (item) => `
        <div class="response-card">
          <strong>${item.name}</strong>
          <p style="margin:10px 0 0;color:#5b6472;line-height:1.7;">${item.recommendation}</p>
        </div>
      `
    )
    .join("");
}

function renderVisibility(result, brandName) {
  const map = {
    visibility: result.visibilityScore,
    mentions: result.brandMentions,
    sentiment: Math.round(result.queryResults.reduce((total, item) => total + item.queryScore, 0) / result.queryResults.length),
    topQueries: result.queryResults.slice().sort((a, b) => b.queryScore - a.queryScore).slice(0, 3).length
  };

  const setText = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = String(value);
  };

  setText("[data-stat-visibility]", map.visibility);
  setText("[data-stat-mentions]", map.mentions);
  setText("[data-stat-sentiment]", map.sentiment);
  setText("[data-stat-queries]", map.topQueries);
  setText("[data-score-main]", map.visibility);
  setText("[data-mentions-main]", map.mentions);

  const sentimentLabel = map.sentiment >= 72 ? "Positive" : map.sentiment >= 46 ? "Neutral" : "Negative";
  setText("[data-sentiment-main]", sentimentLabel);

  const positionsTarget = document.querySelector("[data-positions]");
  if (positionsTarget) {
    positionsTarget.innerHTML = result.queryResults
      .map((item, index) => {
        const position = !item.brandMentioned ? "None" : item.queryScore >= 72 ? "Top" : "Mid";
        return `
          <div class="list-item" style="display:flex;justify-content:space-between;align-items:center;">
            <span>Prompt ${index + 1}</span>
            <span class="badge partial">${position}</span>
          </div>
        `;
      })
      .join("");
  }

  const chartTarget = document.querySelector("[data-competitor-chart]");
  if (chartTarget) {
    chartTarget.innerHTML = `
      <div>
        <div class="chart-line-head"><span><strong>${brandName}</strong></span><span>${result.brandMentions}</span></div>
        <div class="chart-track"><div class="chart-fill" style="width:${Math.max((result.brandMentions / result.totalQueries) * 100, 8)}%"></div></div>
      </div>
      ${result.competitorBrands
        .map(
          (competitor) => `
            <div>
              <div class="chart-line-head"><span><strong>${competitor.brand}</strong></span><span>${competitor.mentionCount}</span></div>
              <div class="chart-track"><div class="chart-fill dark" style="width:${Math.max((competitor.mentionCount / result.totalQueries) * 100, 8)}%"></div></div>
            </div>
          `
        )
        .join("")}
    `;
  }

  const competitorContentTarget = document.querySelector("[data-competitor-content]");
  if (competitorContentTarget) {
    competitorContentTarget.innerHTML = result.competitorBrands
      .slice(0, 3)
      .map(
        (competitor) => `
          <div class="response-card">
            <strong>${competitor.brand}</strong>
            <p style="margin:10px 0 0;color:#5b6472;">Frequently cited in AI answers for this category with stronger comparison-style coverage.</p>
          </div>
        `
      )
      .join("");
  }

  const responsesTarget = document.querySelector("[data-responses]");
  if (responsesTarget) {
    responsesTarget.innerHTML = result.queryResults
      .map(
        (item) => `
          <article class="response-card">
            <strong>${item.query}</strong>
            <p style="margin:12px 0 0;line-height:1.8;color:#4b5563;">${highlightBrand(item.answer, brandName)}</p>
            <p style="margin:12px 0 0;color:#5b6472;font-size:.92rem;"><strong>Competitor mentions:</strong> ${item.competitorMentions.join(", ")}</p>
          </article>
        `
      )
      .join("");
  }
}

function bindDashboard() {
  renderSidebar();
  renderPreferredPatterns();
  renderReportsTable(recentAuditsSeed);
  renderQueryIdeas(queryIdeas);

  const form = document.querySelector("[data-audit-form]");
  if (!form) return;

  const state = {
    keyword: document.querySelector("#keyword"),
    brandName: document.querySelector("#brandName"),
    websiteUrl: document.querySelector("#websiteUrl"),
    aiEngine: document.querySelector("#aiEngine"),
    geoLocation: document.querySelector("#geoLocation"),
    deviceType: "Desktop"
  };

  const error = document.querySelector("[data-error]");
  const audits = [...recentAuditsSeed];

  document.querySelectorAll("[data-device]").forEach((button) => {
    button.addEventListener("click", () => {
      state.deviceType = button.getAttribute("data-device");
      document.querySelectorAll("[data-device]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
    });
  });

  document.querySelector("[data-suggest-keywords]")?.addEventListener("click", () => {
    const phrases = suggestKeywords(state.websiteUrl.value, state.brandName.value);
    renderQueryIdeas(phrases);
    document.querySelector("#content")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelector("[data-run-geo]")?.addEventListener("click", () => {
    const geoAudit = runGeoAudit(state.brandName.value || "Your Brand");
    renderGeoAudit(geoAudit);
    document.querySelector("#geo-audit")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelector("[data-run-crawlability]")?.addEventListener("click", () => {
    const crawlability = runCrawlabilityAudit();
    renderCrawlability(crawlability);
    document.querySelector("#crawlability")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const payload = {
      keyword: state.keyword.value.trim(),
      brandName: state.brandName.value.trim(),
      websiteUrl: state.websiteUrl.value.trim(),
      aiEngine: state.aiEngine.value,
      geoLocation: state.geoLocation.value,
      deviceType: state.deviceType
    };

    if (!payload.keyword || !payload.brandName || !payload.websiteUrl) {
      error.textContent = "Enter keyword, brand name, and website URL to run the audit.";
      error.classList.remove("hidden");
      return;
    }

    error.classList.add("hidden");

    const visibility = runVisibilityAudit(payload);
    const geoAudit = runGeoAudit(payload.brandName);
    const crawlability = runCrawlabilityAudit();
    renderVisibility(visibility, payload.brandName);
    renderGeoAudit(geoAudit);
    renderCrawlability(crawlability);

    audits.unshift({
      name: `${payload.brandName} / ${payload.keyword}`,
      engine: payload.aiEngine,
      date: "Today",
      score: visibility.visibilityScore
    });

    renderReportsTable(audits.slice(0, 6));
    document.querySelector("#overview")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const starter = runVisibilityAudit({
    keyword: state.keyword.value,
    brandName: state.brandName.value,
    websiteUrl: state.websiteUrl.value,
    aiEngine: state.aiEngine.value,
    geoLocation: state.geoLocation.value,
    deviceType: state.deviceType
  });
  renderVisibility(starter, state.brandName.value);
  renderGeoAudit(runGeoAudit(state.brandName.value));
  renderCrawlability(runCrawlabilityAudit());
}

document.addEventListener("DOMContentLoaded", bindDashboard);
