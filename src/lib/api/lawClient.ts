import { transformLawBody } from '../utils/lawParser';
import { ensureArray, normalizeWhitespace } from '../utils/xml';
import { getCachedValue, setCachedValue } from '../utils/cache';
import { logError, logInfo } from '../utils/logger';
import type {
  LawClientConfig,
  LawDetail,
  LawSummary,
  LawsSearchResult,
  Provision,
  SearchParams
} from '../../types/law';

const DEFAULT_BASE_URL = resolveDefaultBaseUrl();
const DEFAULT_PROXY_BASE = resolveDefaultProxyBase();
const DEFAULT_USE_PROXY = resolveDefaultProxyUsage();
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 300;
const DEFAULT_SEARCH_CACHE_TTL_MS = 1000 * 60 * 5;
const DEFAULT_DETAIL_CACHE_TTL_MS = 1000 * 60 * 15;
const SEARCH_CACHE_NAMESPACE = 'law-search';
const DETAIL_CACHE_NAMESPACE = 'law-detail';

const CATEGORY_CODE_MAP: Record<string, readonly string[]> = {
  行政法: ['011', '021'],
  民法: ['046'],
  商法: ['019'],
  労働法: ['020'],
  刑法: ['002'],
  知的財産: ['019', '033'],
  金融: ['024'],
  環境: ['025']
};

export class LawApiError extends Error {
  constructor(message: string, public readonly status?: number, public readonly cause?: unknown) {
    super(message);
    this.name = 'LawApiError';
  }
}

export const searchLaws = async (
  params: SearchParams,
  config: LawClientConfig = {}
): Promise<LawsSearchResult> => {
  const loggerContext = config.loggerContext ?? 'law-client';
  const cacheKey = buildCacheKey('search', params);
  const cacheStrategy = config.cacheStrategy ?? 'session';
  const cacheEnabled = !config.disableCache;

  if (cacheEnabled) {
    const cached = await getCachedValue<LawsSearchResult>(cacheKey, {
      namespace: SEARCH_CACHE_NAMESPACE,
      strategy: cacheStrategy
    });
    if (cached) {
      logInfo('Search cache hit', { cacheKey }, loggerContext);
      return cached;
    }
  }

  const keyword = resolveKeyword(params);
  const { limit, page, offset } = resolvePagination(params);
  const categoryCodes = resolveCategoryCodes(params);
  const order = resolveOrder(params.sort);

  const queryParams: Record<string, string | number> = {
    keyword,
    limit,
    offset,
    response_format: 'json',
    highlight_tag: 'span',
    sentence_text_size: 200,
    sentences_limit: 5
  };

  if (order) {
    queryParams.order = order;
  }
  if (categoryCodes?.length) {
    queryParams.category_cd = categoryCodes.join(',');
  }

  const start = Date.now();
  try {
    const payload = await fetchJson<Record<string, unknown>>('keyword', queryParams, config);
    const executionTimeMs = Date.now() - start;
    const result = normalizeSearchResult(payload, params, { limit, page, executionTimeMs });

    if (cacheEnabled) {
      await setCachedValue(cacheKey, result, {
        namespace: SEARCH_CACHE_NAMESPACE,
        strategy: cacheStrategy,
        ttlMs: config.searchCacheTtlMs ?? DEFAULT_SEARCH_CACHE_TTL_MS
      });
    }

    logInfo('Search request executed', { cacheKey, durationMs: executionTimeMs }, loggerContext);
    return result;
  } catch (error) {
    logError('Search request failed', { cacheKey, params, error }, loggerContext);
    throw error;
  }
};

export const getLawById = async (
  lawId: string,
  config: LawClientConfig = {}
): Promise<LawDetail> => {
  const loggerContext = config.loggerContext ?? 'law-client';
  const cacheKey = buildCacheKey('detail', { lawId });
  const cacheStrategy = config.detailCacheStrategy ?? config.cacheStrategy ?? 'indexedDB';
  const cacheEnabled = !config.disableCache;

  if (cacheEnabled) {
    const cached = await getCachedValue<LawDetail>(cacheKey, {
      namespace: DETAIL_CACHE_NAMESPACE,
      strategy: cacheStrategy
    });
    if (cached) {
      logInfo('Detail cache hit', { cacheKey, lawId }, loggerContext);
      return cached;
    }
  }

  const start = Date.now();
  try {
    const payload = await fetchJson<Record<string, unknown>>(
      `law_data/${encodeURIComponent(lawId)}`,
      {
        response_format: 'json',
        law_full_text_format: 'json'
      },
      config
    );
    const detail = normalizeLawDetail(payload);
    const elapsed = Date.now() - start;

    if (cacheEnabled) {
      await setCachedValue(cacheKey, detail, {
        namespace: DETAIL_CACHE_NAMESPACE,
        strategy: cacheStrategy,
        ttlMs: config.detailCacheTtlMs ?? DEFAULT_DETAIL_CACHE_TTL_MS
      });
    }

    logInfo('Detail request executed', { cacheKey, lawId, durationMs: elapsed }, loggerContext);
    return detail;
  } catch (error) {
    logError('Detail request failed', { cacheKey, lawId, error }, loggerContext);
    throw error;
  }
};

export const pickRandomProvision = async (lawDetail: LawDetail): Promise<Provision> => {
  if (!lawDetail.provisions.length) {
    throw new LawApiError('No provisions available to pick from.');
  }
  const randomIndex = Math.floor(Math.random() * lawDetail.provisions.length);
  return lawDetail.provisions[randomIndex];
};

export const extractProvisionsByKeyword = (lawDetail: LawDetail, keyword: string): Provision[] => {
  if (!keyword.trim()) {
    return [];
  }
  const normalizedKeyword = keyword.toLowerCase();
  return lawDetail.provisions.filter((provision) =>
    provision.text.toLowerCase().includes(normalizedKeyword)
  );
};

const fetchJson = async <T extends Record<string, unknown> | unknown[]>(
  endpoint: string,
  params: Record<string, string | number | boolean | undefined> | undefined,
  config: LawClientConfig
): Promise<T> => {
  const fetchImpl = config.fetchImpl ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new LawApiError('Fetch API is not available in the current environment.');
  }

  const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryDelayMs = config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const url = buildRequestUrl(endpoint, params, config);
  const loggerContext = config.loggerContext ?? 'law-client';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchImpl(url, {
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) {
        const errorPayload = await safeParseJson(response);
        const message = buildErrorMessage(response.status, errorPayload);
        if (shouldRetry(response.status) && attempt < maxRetries) {
          await delay(retryDelayMs * 2 ** attempt);
          continue;
        }
        const error = new LawApiError(message, response.status, errorPayload);
        logError('Law API responded with error', { endpoint, url, status: response.status, errorPayload }, loggerContext);
        throw error;
      }

      const payload = (await safeParseJson(response)) as T;
      return payload;
    } catch (error) {
      if (attempt >= maxRetries) {
        if (error instanceof LawApiError) {
          logError('Law API request exhausted retries', { endpoint, url, error }, loggerContext);
          throw error;
        }
        logError('Law API request failed', { endpoint, url, error }, loggerContext);
        throw new LawApiError('Law API request failed', undefined, error);
      }
      await delay(retryDelayMs * 2 ** attempt);
    }
  }

  const finalError = new LawApiError('Law API request exhausted retries.');
  logError('Law API retry budget exceeded', { endpoint, url }, loggerContext);
  throw finalError;
};

const buildRequestUrl = (
  endpoint: string,
  params: Record<string, string | number | boolean | undefined> | undefined,
  config: LawClientConfig
): string => {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const url = new URL(endpoint, ensureTrailingSlash(baseUrl));
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }
      url.searchParams.append(key, String(value));
    });
  }

  const useProxy = config.useProxy ?? DEFAULT_USE_PROXY;
  if (!useProxy) {
    return url.toString();
  }

  const proxyBase = config.proxyBaseUrl ?? DEFAULT_PROXY_BASE;
  const proxyUrl = new URL(proxyBase, typeof window === 'undefined' ? 'http://localhost' : window.location.origin);
  proxyUrl.searchParams.set('target', url.toString());
  return proxyUrl.toString();
};

const normalizeSearchResult = (
  payload: Record<string, unknown>,
  params: SearchParams,
  meta: { limit: number; page: number; executionTimeMs: number }
): LawsSearchResult => {
  const items = ensureArray(payload.items);
  const results: LawSummary[] = items.map((item) => normalizeLawSummary(item as Record<string, unknown>));

  const totalCount = toNumber(payload.total_count) ?? results.length;
  const numberOfRecords = results.length;
  const nextOffset = toNumber(payload.next_offset);

  return {
    totalCount,
    page: meta.page,
    numberOfRecords,
    pageSize: meta.limit,
    hasNext: nextOffset !== undefined && nextOffset !== null,
    hasPrevious: meta.page > 1,
    executionTimeMs: meta.executionTimeMs,
    query: params,
    results
  };
};

const buildCacheKey = (prefix: string, params: unknown): string =>
  `${prefix}:${stableStringify(params)}`;

const stableStringify = (value: unknown): string => {
  if (value === undefined) {
    return 'undefined';
  }
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries
    .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
    .join(',')}}`;
};

const normalizeLawDetail = (payload: Record<string, unknown>): LawDetail => {
  const lawInfo = (payload.law_info ?? {}) as Record<string, unknown>;
  const revisionInfo = (payload.revision_info ?? {}) as Record<string, unknown>;
  const lawId = toStringRequired(lawInfo.law_id ?? extractLawIdFromRevision(revisionInfo), 'lawId');
  const lawName = toStringRequired(
    revisionInfo.law_title ?? lawInfo.law_title ?? lawInfo.law_num ?? lawId,
    'lawName'
  );
  const lawNumber = toOptionalString(lawInfo.law_num ?? revisionInfo.law_num);
  const promulgationDate = toOptionalString(lawInfo.promulgation_date ?? revisionInfo.promulgation_date);
  const lawType = toOptionalString(revisionInfo.law_type ?? lawInfo.law_type);
  const lawTitleKana = toOptionalString(revisionInfo.law_title_kana);
  const abbrev = toOptionalString(revisionInfo.abbrev);
  const category = toOptionalString(revisionInfo.category);
  const lastRevisionDate = toOptionalString(revisionInfo.amendment_promulgate_date ?? revisionInfo.updated);

  const lawBody = payload.law_full_text;
  const { articles, provisions } = transformLawBody(lawId, lawBody);

  return {
    lawId,
    lawName,
    lawNameKana: lawTitleKana,
    shortTitle: abbrev,
    lawNumber,
    promulgationDate,
    lawType,
    lastRevisionDate,
    categories: category ? [category] : undefined,
    sourceUrl: buildDocumentUrl(lawId),
    articles,
    provisions,
    raw: payload
  };
};

const normalizeLawSummary = (node: unknown): LawSummary => {
  const record = (node ?? {}) as Record<string, unknown>;
  const lawInfo = (record.law_info ?? {}) as Record<string, unknown>;
  const revisionInfo = (record.revision_info ?? {}) as Record<string, unknown>;
  const sentences = ensureArray(record.sentences);

  const lawId = toStringRequired(lawInfo.law_id ?? extractLawIdFromRevision(revisionInfo), 'lawId');
  const lawName = toStringRequired(
    revisionInfo.law_title ?? lawInfo.law_title ?? lawInfo.law_num ?? lawId,
    'lawName'
  );
  const lawNumber = toOptionalString(lawInfo.law_num ?? revisionInfo.law_num);
  const promulgationDate = toOptionalString(lawInfo.promulgation_date ?? revisionInfo.amendment_promulgate_date);
  const lawType = toOptionalString(revisionInfo.law_type ?? lawInfo.law_type);
  const category = toOptionalString(revisionInfo.category);
  const highlights = sentences
    .map((entry) => sanitizeSentence((entry as Record<string, unknown>).text))
    .filter(Boolean) as string[];

  return {
    lawId,
    lawName,
    lawNumber,
    promulgationDate,
    lawType,
    categories: category ? [category] : undefined,
    highlights
  };
};

const ensureTrailingSlash = (base: string): string => (base.endsWith('/') ? base : `${base}/`);

const toOptionalString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  return normalizeWhitespace(String(value));
};

const toStringRequired = (value: unknown, field: string): string => {
  const normalized = toOptionalString(value);
  if (!normalized) {
    throw new LawApiError(`Expected "${field}" in law payload.`);
  }
  return normalized;
};

const shouldRetry = (status?: number): boolean => {
  if (!status) {
    return true;
  }
  return status >= 500 || status === 429;
};

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const resolveKeyword = (params: SearchParams): string => {
  if (params.keyword?.trim()) {
    return params.keyword.trim();
  }
  const joined = params.keywords?.map((token) => token.trim()).filter(Boolean).join(' ');
  if (joined) {
    return joined;
  }
  throw new LawApiError('Search keyword is required.');
};

const resolvePagination = (params: SearchParams): { limit: number; page: number; offset: number } => {
  const rawPageSize = params.pageSize ?? params.numberOfRecords ?? 20;
  const limit = Math.max(1, Math.min(200, Math.floor(rawPageSize)));
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const offset = (page - 1) * limit;
  return { limit, page, offset };
};

const resolveOrder = (sort: SearchParams['sort']): string | undefined => {
  switch (sort) {
    case 'promulgationDate':
      return '-law_info.promulgation_date';
    case 'lawNumber':
      return '+law_info.law_num';
    default:
      return undefined;
  }
};

const resolveCategoryCodes = (params: SearchParams): string[] | undefined => {
  if (Array.isArray(params.categoryCodes) && params.categoryCodes.length) {
    return params.categoryCodes;
  }
  if (!params.lawCategory) {
    return undefined;
  }
  const normalized = params.lawCategory.trim();
  const mapped = CATEGORY_CODE_MAP[normalized as keyof typeof CATEGORY_CODE_MAP];
  return mapped ? [...mapped] : undefined;
};

const sanitizeSentence = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const withoutTags = value.replace(/<[^>]+>/g, ' ');
  const cleaned = normalizeWhitespace(withoutTags);
  return cleaned || undefined;
};

const toNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const extractLawIdFromRevision = (revisionInfo: Record<string, unknown>): string | undefined => {
  const revisionId = toOptionalString(revisionInfo?.law_revision_id);
  if (!revisionId) {
    return undefined;
  }
  const [lawId] = revisionId.split('_');
  return lawId;
};

const buildDocumentUrl = (lawId: string): string =>
  `https://elaws.e-gov.go.jp/document?lawid=${encodeURIComponent(lawId)}`;

const safeParseJson = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json().catch(() => null);
  }
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const buildErrorMessage = (status: number, payload: unknown): string => {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const record = payload as Record<string, unknown>;
    const code = toOptionalString(record.code);
    const message = toOptionalString(record.message);
    if (code || message) {
      return `Law API request failed with status ${status}${code ? ` (${code})` : ''}${message ? `: ${message}` : ''}`;
    }
  }
  return `Law API request failed with status ${status}`;
};

function resolveDefaultBaseUrl(): string {
  const viteEnv = typeof import.meta !== 'undefined' ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env : undefined;
  const nodeProcess = (globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }).process;
  const candidates = [
    viteEnv?.VITE_EGOV_LAW_API_BASE_URL,
    viteEnv?.VITE_API_BASE_URL,
    nodeProcess?.env?.VITE_EGOV_LAW_API_BASE_URL,
    nodeProcess?.env?.VITE_API_BASE_URL
  ];
  for (const candidate of candidates) {
    if (candidate) {
      return candidate;
    }
  }
  return 'https://laws.e-gov.go.jp/api/2/';
}

function resolveDefaultProxyBase(): string {
  const viteEnv = typeof import.meta !== 'undefined' ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env : undefined;
  const nodeProcess = (globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }).process;
  return (
    viteEnv?.VITE_PROXY_BASE_URL ??
    nodeProcess?.env?.VITE_PROXY_BASE_URL ??
    '/api/proxy?target='
  );
}

function resolveDefaultProxyUsage(): boolean {
  const viteEnv = typeof import.meta !== 'undefined' ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env : undefined;
  const nodeProcess = (globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }).process;
  const flag = viteEnv?.VITE_USE_PROXY ?? nodeProcess?.env?.VITE_USE_PROXY;
  if (flag === undefined) {
    return false;
  }
  return ['1', 'true', 'yes'].includes(flag.toLowerCase());
}

export type { LawClientConfig } from '../../types/law';
