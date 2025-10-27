import { transformLawBody } from '../utils/lawParser';
import { ensureArray, getFirstMatchingKey, normalizeWhitespace, parseXmlToJson } from '../utils/xml';
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

  const start = Date.now();
  try {
    const xml = await fetchXml('laws/search', params as Record<string, unknown>, config);
    const json = parseXmlToJson<Record<string, unknown>>(xml);
    const normalized = normalizeSearchResult(json);
    const enriched: LawsSearchResult = {
      ...normalized,
      executionTimeMs: Date.now() - start,
      query: params
    };

    if (cacheEnabled) {
      await setCachedValue(cacheKey, enriched, {
        namespace: SEARCH_CACHE_NAMESPACE,
        strategy: cacheStrategy,
        ttlMs: config.searchCacheTtlMs ?? DEFAULT_SEARCH_CACHE_TTL_MS
      });
    }

    logInfo('Search request executed', { cacheKey, durationMs: enriched.executionTimeMs }, loggerContext);
    return enriched;
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
    const xml = await fetchXml(`laws/${encodeURIComponent(lawId)}`, undefined, config);
    const json = parseXmlToJson<Record<string, unknown>>(xml);
    const detail = normalizeLawDetail(json);
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

const fetchXml = async (
  endpoint: string,
  params: Record<string, unknown> | undefined,
  config: LawClientConfig
): Promise<string> => {
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
      const response = await fetchImpl(url, { headers: { Accept: 'application/xml' } });
      if (!response.ok) {
        const message = `Law API request failed with status ${response.status}`;
        if (shouldRetry(response.status) && attempt < maxRetries) {
          await delay(retryDelayMs * 2 ** attempt);
          continue;
        }
        const error = new LawApiError(message, response.status);
        logError('Law API responded with error', { endpoint, url, status: response.status }, loggerContext);
        throw error;
      }
      return await response.text();
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
  params: Record<string, unknown> | undefined,
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

const normalizeSearchResult = (json: Record<string, unknown>): LawsSearchResult => {
  const root =
    getFirstMatchingKey(json, ['eGovLawSearchResult']) ??
    getFirstMatchingKey(json, ['ELawsSearchResult']) ??
    json;

  const resultNode =
    getFirstMatchingKey(root, ['result']) ??
    getFirstMatchingKey(root, ['Result']);

  const totalCount = Number(
    getFirstMatchingKey(resultNode, ['numberOfResults', 'NumberOfResults', 'totalCount']) ?? 0
  );
  const page = Number(
    getFirstMatchingKey(resultNode, ['page', 'Page', 'pageNumber']) ?? 1
  );
  const numberOfRecords = Number(
    getFirstMatchingKey(resultNode, ['numberOfRecords', 'NumberOfRecords', 'count']) ?? 0
  );
  const status = toOptionalString(getFirstMatchingKey(resultNode, ['status', 'Status']));
  const message = toOptionalString(getFirstMatchingKey(resultNode, ['message', 'Message']));

  const lawsNode =
    getFirstMatchingKey(root, ['laws']) ??
    getFirstMatchingKey(root, ['Laws']);
  const lawEntries = ensureArray(getFirstMatchingKey(lawsNode, ['law', 'Law']));
  const results: LawSummary[] = lawEntries.map(normalizeLawSummary);

  return {
    totalCount: totalCount || results.length,
    page,
    numberOfRecords: numberOfRecords || results.length,
    status,
    message,
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

const normalizeLawDetail = (json: Record<string, unknown>): LawDetail => {
  const root =
    getFirstMatchingKey(json, ['eGovLawDetail']) ??
    getFirstMatchingKey(json, ['ELawsLawDetail']) ??
    json;

  const lawNode = getFirstMatchingKey(root, ['law', 'Law']);
  if (!lawNode) {
    throw new LawApiError('Law detail payload is missing law node.');
  }

  const lawId = toStringRequired(getFirstMatchingKey(lawNode, ['lawId', 'LawId', 'LawID']), 'lawId');
  const lawName = toStringRequired(getFirstMatchingKey(lawNode, ['lawName', 'LawName']), 'lawName');
  const lawNumber = toOptionalString(getFirstMatchingKey(lawNode, ['lawNo', 'LawNo', 'lawNumber', 'LawNumber']));
  const promulgationDate = toOptionalString(
    getFirstMatchingKey(lawNode, ['promulgationDate', 'PromulgationDate'])
  );
  const lawType = toOptionalString(getFirstMatchingKey(lawNode, ['lawType', 'LawType']));

  const lawBody = getFirstMatchingKey(lawNode, ['lawBody', 'LawBody']);
  const { articles, provisions } = transformLawBody(lawId, lawBody);

  return {
    lawId,
    lawName,
    lawNumber,
    promulgationDate,
    lawType,
    articles,
    provisions,
    raw: json
  };
};

const normalizeLawSummary = (node: unknown): LawSummary => {
  const lawId = toStringRequired(getFirstMatchingKey(node, ['lawId', 'LawId', 'LawID']), 'lawId');
  const lawName = toStringRequired(getFirstMatchingKey(node, ['lawName', 'LawName']), 'lawName');
  const lawNumber = toOptionalString(getFirstMatchingKey(node, ['lawNo', 'LawNo', 'lawNumber', 'LawNumber']));
  const promulgationDate = toOptionalString(
    getFirstMatchingKey(node, ['promulgationDate', 'PromulgationDate'])
  );
  const lawType = toOptionalString(getFirstMatchingKey(node, ['lawType', 'LawType']));

  return {
    lawId,
    lawName,
    lawNumber,
    promulgationDate,
    lawType
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
  return 'https://www.e-gov.go.jp/elaws/api/v1/';
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
