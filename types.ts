export type AnalysisRequest = {
  keyword: string;
  brandName: string;
  websiteUrl: string;
};

export type RankedKeyword = {
  phrase: string;
  score: number;
};

export type KeywordSuggestionResponse = {
  keywords: RankedKeyword[];
  source: "website-content" | "url-fallback";
};

export type GeoParameterStatus = "covered" | "partial" | "missing";

export type GeoParameter = {
  name: string;
  status: GeoParameterStatus;
  detail: string;
  evidence: string;
  recommendation: string;
};

export type GeoAuditResponse = {
  score: number;
  coveredCount: number;
  partialCount: number;
  missingCount: number;
  parameters: GeoParameter[];
};

export type CrawlabilityCheckStatus = "covered" | "partial" | "missing";

export type CrawlabilityCheck = {
  name: string;
  status: CrawlabilityCheckStatus;
  detail: string;
  evidence: string;
  recommendation: string;
};

export type CrawlabilityAuditResponse = {
  score: number;
  coveredCount: number;
  partialCount: number;
  missingCount: number;
  checks: CrawlabilityCheck[];
};

export type QueryResult = {
  query: string;
  answer: string;
  mentions: string[];
  brandMentioned: boolean;
  competitorMentions: string[];
  queryScore: number;
};

export type CompetitorBrand = {
  brand: string;
  mentionCount: number;
};

export type AnalysisResponse = {
  visibilityScore: number;
  brandMentions: number;
  competitorMentions: number;
  totalQueries: number;
  generatedQueries: string[];
  queryResults: QueryResult[];
  competitorBrands: CompetitorBrand[];
};
