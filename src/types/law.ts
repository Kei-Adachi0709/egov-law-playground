export interface SearchParams {
  keyword?: string;
  keywords?: string[];
  lawName?: string;
  lawNumber?: string;
  promulgationDateFrom?: string;
  promulgationDateTo?: string;
  enforcementDateFrom?: string;
  enforcementDateTo?: string;
  lawCategory?: string;
  categoryCodes?: string[];
  lawType?: string;
  articleNumber?: string;
  paragraphNumber?: string;
  itemNumber?: string;
  includeRepealed?: boolean;
  page?: number;
  numberOfRecords?: number;
  pageSize?: number;
  sort?: 'relevance' | 'promulgationDate' | 'lawNumber';
  highlight?: boolean;
  fields?: string[];
}

export interface LawSummary {
  lawId: string;
  lawName: string;
  lawNameKana?: string;
  shortTitle?: string;
  lawNumber?: string;
  promulgationDate?: string;
  enforcementDate?: string;
  revisionDate?: string;
  lawType?: string;
  categories?: string[];
  score?: number;
  highlights?: string[];
  url?: string;
}

export interface LawsSearchResult {
  totalCount: number;
  page: number;
  numberOfRecords: number;
  pageSize?: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
  status?: string;
  message?: string;
  executionTimeMs?: number;
  query?: SearchParams;
  results: LawSummary[];
}

export interface LawDetail {
  lawId: string;
  lawName: string;
  lawNameKana?: string;
  shortTitle?: string;
  lawNumber?: string;
  promulgationDate?: string;
  enforcementDate?: string;
  lastRevisionDate?: string;
  lawType?: string;
  categories?: string[];
  summary?: string;
  sourceUrl?: string;
  articles: Article[];
  provisions: Provision[];
  annotations?: Record<string, string>;
  relatedLaws?: Array<Pick<LawSummary, 'lawId' | 'lawName'>>;
  raw: unknown;
}

export interface Article {
  articleNumber: string;
  articleTitle?: string;
  articleHeading?: string;
  paragraphs: Paragraph[];
}

export interface Paragraph {
  paragraphNumber: string;
  paragraphLabel?: string;
  text: string;
  items: Item[];
  notes?: string[];
}

export interface Item {
  itemNumber: string;
  itemLabel?: string;
  text: string;
  subItems?: Item[];
  notes?: string[];
}

export interface Provision {
  lawId: string;
  articleNumber: string;
  articleTitle?: string;
  paragraphNumber?: string;
  paragraphLabel?: string;
  itemNumber?: string;
  itemLabel?: string;
  subItemNumber?: string;
  text: string;
  notes?: string[];
  path: string;
}

export interface LawClientConfig {
  baseUrl?: string;
  useProxy?: boolean;
  proxyBaseUrl?: string;
  fetchImpl?: typeof fetch;
  maxRetries?: number;
  retryDelayMs?: number;
  disableCache?: boolean;
  cacheStrategy?: 'session' | 'indexedDB' | 'memory';
  detailCacheStrategy?: 'session' | 'indexedDB' | 'memory';
  searchCacheTtlMs?: number;
  detailCacheTtlMs?: number;
  loggerContext?: string;
}
