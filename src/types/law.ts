export interface SearchParams {
  keyword?: string;
  lawName?: string;
  lawNumber?: string;
  promulgationDateFrom?: string;
  promulgationDateTo?: string;
  lawCategory?: string;
  page?: number;
  numberOfRecords?: number;
}

export interface LawSummary {
  lawId: string;
  lawName: string;
  lawNumber?: string;
  promulgationDate?: string;
  lawType?: string;
}

export interface LawsSearchResult {
  totalCount: number;
  page: number;
  numberOfRecords: number;
  results: LawSummary[];
  status?: string;
  message?: string;
}

export interface LawDetail {
  lawId: string;
  lawName: string;
  lawNumber?: string;
  promulgationDate?: string;
  lawType?: string;
  articles: Article[];
  provisions: Provision[];
  raw: unknown;
}

export interface Article {
  articleNumber: string;
  articleTitle?: string;
  paragraphs: Paragraph[];
}

export interface Paragraph {
  paragraphNumber: string;
  text: string;
  items: Item[];
}

export interface Item {
  itemNumber: string;
  text: string;
}

export interface Provision {
  lawId: string;
  articleNumber: string;
  paragraphNumber?: string;
  itemNumber?: string;
  text: string;
  path: string;
}

export interface LawClientConfig {
  baseUrl?: string;
  useProxy?: boolean;
  proxyBaseUrl?: string;
  fetchImpl?: typeof fetch;
  maxRetries?: number;
  retryDelayMs?: number;
}
