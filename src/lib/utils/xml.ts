import { XMLParser, type X2jOptionsOptional } from 'fast-xml-parser';

const defaultParserOptions: X2jOptionsOptional = {
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '#text',
  allowBooleanAttributes: true,
  trimValues: true,
  parseTagValue: true,
  parseAttributeValue: true,
  ignoreDeclaration: false
};

const parserCache = new Map<string, XMLParser>();

const getParser = (options?: X2jOptionsOptional): XMLParser => {
  const key = JSON.stringify(options ?? {});
  let parser = parserCache.get(key);
  if (!parser) {
    parser = new XMLParser({ ...defaultParserOptions, ...options });
    parserCache.set(key, parser);
  }
  return parser;
};

export const parseXmlToJson = <T>(xml: string, options?: X2jOptionsOptional): T => {
  try {
    return getParser(options).parse(xml) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown XML parse error';
    throw new Error(`Failed to parse XML: ${message}`);
  }
};

type PathSegment = string | number;
type PathInput = string | readonly PathSegment[];

const PATH_DELIMITER = '.';

const isNumericSegment = (segment: PathSegment): segment is number =>
  typeof segment === 'number' || (typeof segment === 'string' && /^\d+$/.test(segment));

const normalizePath = (path: PathInput): PathSegment[] => {
  if (Array.isArray(path)) {
    return [...path];
  }

  const raw = String(path);
  if (!raw.includes(PATH_DELIMITER)) {
    return [raw];
  }

  return raw
    .split(PATH_DELIMITER)
    .map<PathSegment>((segment) => (isNumericSegment(segment) ? Number(segment) : segment))
    .filter((segment) => segment !== '');
};

const resolveObjectKey = (target: Record<string, unknown>, segment: string): string | undefined => {
  if (segment in target) {
    return segment;
  }
  const lower = segment.toLowerCase();
  return Object.keys(target).find((key) => key.toLowerCase() === lower);
};

export const getValueAtPath = <T>(source: unknown, path: PathInput, fallback?: T): T | undefined => {
  const segments = normalizePath(path);
  let current: unknown = source;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return fallback;
    }

    if (Array.isArray(current)) {
      const index = typeof segment === 'number' ? segment : Number(segment);
      current = Number.isInteger(index) ? current[index] : undefined;
      continue;
    }

    if (typeof current === 'object') {
      const record = current as Record<string, unknown>;
      const key = typeof segment === 'string' ? resolveObjectKey(record, segment) : String(segment);
      if (!key || !(key in record)) {
        return fallback;
      }
      current = record[key];
      continue;
    }

    return fallback;
  }

  return (current as T) ?? fallback;
};

export const getFirstMatchingKey = (
  source: unknown,
  candidates: readonly string[],
  { caseInsensitive = true }: { caseInsensitive?: boolean } = {}
): unknown => {
  if (source === null || typeof source !== 'object') {
    return undefined;
  }

  const entries = Object.entries(source as Record<string, unknown>);
  for (const [key, value] of entries) {
    for (const candidate of candidates) {
      if (caseInsensitive) {
        if (candidate.toLowerCase() === key.toLowerCase()) {
          return value;
        }
      } else if (candidate === key) {
        return value;
      }
    }
  }

  return undefined;
};

export const ensureArray = <T>(value: T | T[] | undefined | null): T[] => {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

export const normalizeWhitespace = (value: string | undefined | null): string => {
  if (!value) {
    return '';
  }
  return value.replace(/\s+/g, ' ').trim();
};

export const hasPath = (source: unknown, path: PathInput): boolean => getValueAtPath(source, path) !== undefined;
