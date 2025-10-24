import { XMLParser, type X2jOptionsOptional } from 'fast-xml-parser';

const defaultParserOptions: X2jOptionsOptional = {
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'value',
  allowBooleanAttributes: true,
  trimValues: true,
  parseTagValue: true,
  parseAttributeValue: true
};

const parserCache = new Map<string, XMLParser>();

const getParser = (options?: X2jOptionsOptional): XMLParser => {
  const key = JSON.stringify(options ?? {});
  if (!parserCache.has(key)) {
    parserCache.set(key, new XMLParser({ ...defaultParserOptions, ...options }));
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return parserCache.get(key)!;
};

export const parseXmlToJson = <T>(xml: string, options?: X2jOptionsOptional): T => {
  try {
    return getParser(options).parse(xml) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown XML parse error';
    throw new Error(`Failed to parse XML: ${message}`);
  }
};

export const getValueAtPath = <T>(source: unknown, path: string[]): T | undefined => {
  let current: unknown = source;
  for (const segment of path) {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }
    const keys = Object.keys(current as Record<string, unknown>);
    const match = keys.find((key) => key === segment || key.toLowerCase() === segment.toLowerCase());
    if (!match) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[match];
  }
  return current as T;
};

export const getFirstMatchingKey = (source: unknown, candidates: string[]): unknown => {
  if (source === null || typeof source !== 'object') {
    return undefined;
  }
  const entries = Object.entries(source as Record<string, unknown>);
  const match = entries.find(([key]) => candidates.some((candidate) => candidate.toLowerCase() === key.toLowerCase()));
  return match ? match[1] : undefined;
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
