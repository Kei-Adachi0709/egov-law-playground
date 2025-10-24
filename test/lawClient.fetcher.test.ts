/// <reference path="./vitest-globals.d.ts" />

import { extractProvisionsByKeyword, getLawById, pickRandomProvision, searchLaws } from '../src/lib/api/lawClient';
import type { LawClientConfig } from '../src/types/law';

describe('lawClient', () => {
  const baseConfig: LawClientConfig = {
    baseUrl: 'https://api.example.com/',
    fetchImpl: async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.includes('/laws/search')) {
        return createResponse(sampleSearchXml);
      }
      if (url.includes('/laws/TEST-LAW')) {
        return createResponse(sampleDetailXml);
      }
      return createResponse('Not Found', 404);
    }
  };

  it('searches laws and normalizes the response', async () => {
    const result = await searchLaws({ keyword: 'test' }, baseConfig);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      lawId: 'TEST-LAW',
      lawName: 'Test Law'
    });
  });

  it('retrieves law details and provisions', async () => {
    const detail = await getLawById('TEST-LAW', baseConfig);
    expect(detail.lawName).toBe('Test Law');
    expect(detail.provisions).toHaveLength(3);
    expect(detail.articles[0].paragraphs[0].text).toContain('Purpose');
  });

  it('picks a random provision deterministically via mocked random', async () => {
    const detail = await getLawById('TEST-LAW', baseConfig);
    const originalRandom = Math.random;
    Math.random = () => 0.5;
    const provision = await pickRandomProvision(detail);
    expect(provision.path).toContain('第2項');
    Math.random = originalRandom;
  });

  it('extracts provisions matching a keyword', async () => {
    const detail = await getLawById('TEST-LAW', baseConfig);
    const matches = extractProvisionsByKeyword(detail, 'condition');
    expect(matches).toHaveLength(1);
    expect(matches[0].text).toContain('condition');
  });

  it('retries and throws when response is not ok', async () => {
    let callCount = 0;
    const failingConfig: LawClientConfig = {
      baseUrl: 'https://api.example.com/',
      maxRetries: 1,
      fetchImpl: async () => {
        callCount += 1;
        return createResponse('Server Error', 503);
      }
    };

    await expect(searchLaws({ keyword: 'fail' }, failingConfig)).rejects.toThrow();
    expect(callCount).toBeGreaterThan(1);
  });

  it('supports proxy mode when configured', async () => {
    const calls: Array<RequestInfo | URL> = [];
    const fetchSpy = async (input: RequestInfo | URL) => {
      calls.push(input);
      return createResponse(sampleSearchXml);
    };
    await searchLaws(
      { keyword: 'proxy' },
      {
        baseUrl: 'https://api.example.com/',
        useProxy: true,
        proxyBaseUrl: 'https://proxy.local/?target=',
        fetchImpl: fetchSpy
      }
    );

    expect(calls.length).toBe(1);
    const calledUrl = calls[0].toString();
    expect(calledUrl).toMatch(/^https:\/\/proxy\.local/);
    expect(decodeURIComponent(new URL(calledUrl).searchParams.get('target') ?? '')).toContain('/laws/search');
  });
});

const sampleSearchXml = `<?xml version="1.0" encoding="UTF-8"?>
<eGovLawSearchResult>
  <result>
    <status>0</status>
    <message>OK</message>
    <numberOfResults>1</numberOfResults>
    <page>1</page>
    <numberOfRecords>1</numberOfRecords>
  </result>
  <laws>
    <law>
      <lawId>TEST-LAW</lawId>
      <lawName>Test Law</lawName>
      <lawNo>Law No. 1</lawNo>
      <promulgationDate>2020-01-01</promulgationDate>
      <lawType>Act</lawType>
    </law>
  </laws>
</eGovLawSearchResult>`;

const sampleDetailXml = `<?xml version="1.0" encoding="UTF-8"?>
<eGovLawDetail>
  <law>
    <lawId>TEST-LAW</lawId>
    <lawName>Test Law</lawName>
    <lawNo>Law No. 1</lawNo>
    <promulgationDate>2020-01-01</promulgationDate>
    <lawType>Act</lawType>
    <lawBody>
      <article>
        <articleNumber>第1条</articleNumber>
        <articleTitle>Purpose</articleTitle>
        <paragraph>
          <paragraphNumber>1</paragraphNumber>
          <paragraphSentence>
            <sentence>This law explains the purpose.</sentence>
          </paragraphSentence>
        </paragraph>
        <paragraph>
          <paragraphNumber>2</paragraphNumber>
          <paragraphSentence>
            <sentence>This law applies when the following conditions are met.</sentence>
          </paragraphSentence>
          <item>
            <itemNumber>一</itemNumber>
            <itemSentence>
              <sentence>First condition is satisfied.</sentence>
            </itemSentence>
          </item>
        </paragraph>
      </article>
    </lawBody>
  </law>
</eGovLawDetail>`;

const createResponse = (body: string, status = 200): Response =>
  new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/xml'
    }
  });
