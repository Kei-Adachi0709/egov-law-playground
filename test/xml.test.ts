/// <reference path="./vitest-globals.d.ts" />

import { ensureArray, getFirstMatchingKey, getValueAtPath, hasPath, normalizeWhitespace, parseXmlToJson } from '../src/lib/utils/xml';

const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <Result>
    <Status>0</Status>
    <Message>OK</Message>
  </Result>
</root>`;

describe('xml utils', () => {
  it('parses xml to json', () => {
    const json = parseXmlToJson<Record<string, unknown>>(sampleXml);
    expect(json).toHaveProperty('root');
  });

  it('retrieves value at path case-insensitively', () => {
    const json = parseXmlToJson<Record<string, unknown>>(sampleXml);
    expect(getValueAtPath(json, ['root', 'result', 'status'])).toBe(0);
  });

  it('supports string based path navigation', () => {
    const json = parseXmlToJson<Record<string, unknown>>(sampleXml);
    expect(getValueAtPath(json, 'root.Result.Message')).toBe('OK');
    expect(hasPath(json, 'root.Result.Status')).toBe(true);
    expect(getValueAtPath(json, 'root.Result.Unknown', 'fallback')).toBe('fallback');
  });

  it('finds first matching key', () => {
    const json = parseXmlToJson<Record<string, unknown>>(sampleXml);
    const result = getFirstMatchingKey(
      (json.root as Record<string, unknown> | undefined)?.Result,
      ['message']
    );
    expect(result).toBe('OK');
  });

  it('ensures values are arrays', () => {
    expect(ensureArray(undefined)).toEqual([]);
    expect(ensureArray('value')).toEqual(['value']);
    expect(ensureArray(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('normalizes whitespace', () => {
    expect(normalizeWhitespace('  foo   bar \n ')).toBe('foo bar');
  });
});
