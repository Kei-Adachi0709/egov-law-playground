/// <reference path="./vitest-globals.d.ts" />

import { extractProvisionsByKeyword, getLawById, pickRandomProvision, searchLaws } from '../src/lib/api/lawClient';
import type { LawClientConfig } from '../src/types/law';

describe('lawClient', () => {
  const baseConfig: LawClientConfig = {
    baseUrl: 'https://api.example.com/',
    useProxy: false,
    fetchImpl: async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.includes('/keyword')) {
        return createResponse(sampleSearchJson);
      }
      if (url.includes('/law_data/TEST-LAW')) {
        return createResponse(sampleDetailJson);
      }
      return createResponse('Not Found', 404);
    }
  };

  it('searches laws and normalizes the response', async () => {
    const result = await searchLaws({ keyword: 'test' }, baseConfig);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      lawId: 'TEST-LAW',
      lawName: 'Test Law',
      highlights: ['This law explains the purpose.', 'This law applies when the following conditions are met.']
    });
  });

  it('retrieves law details and provisions', async () => {
    const detail = await getLawById('TEST-LAW', baseConfig);
    expect(detail.lawName).toBe('Test Law');
    expect(detail.provisions).toHaveLength(3);
    expect(detail.articles[0].paragraphs[0].text.toLowerCase()).toContain('purpose');
  });

  it('picks a random provision deterministically via mocked random', async () => {
    const detail = await getLawById('TEST-LAW', baseConfig);
    const originalRandom = Math.random;
    Math.random = () => 0.5;
  const provision = await pickRandomProvision(detail);
    expect(provision.path).toBe('第2条 第1項 第1号');
    Math.random = originalRandom;
  });

  it('extracts provisions matching a keyword', async () => {
    const detail = await getLawById('TEST-LAW', baseConfig);
    const matches = extractProvisionsByKeyword(detail, 'condition');
    expect(matches).toHaveLength(2);
    expect(matches.every((match) => match.text.toLowerCase().includes('condition'))).toBe(true);
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
      return createResponse(sampleSearchJson);
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
    expect(decodeURIComponent(new URL(calledUrl).searchParams.get('target') ?? '')).toContain('/keyword');
  });
});

const sampleSearchJson = JSON.stringify({
  total_count: 1,
  sentence_count: 2,
  next_offset: null,
  items: [
    {
      law_info: {
        law_type: 'Act',
        law_id: 'TEST-LAW',
        law_num: 'Law No. 1',
        promulgation_date: '2020-01-01'
      },
      revision_info: {
        law_title: 'Test Law',
        category: '民事'
      },
      sentences: [
        {
          position: 'mainprovision',
          text: 'This law explains the purpose.'
        },
        {
          position: 'mainprovision',
          text: 'This law applies when the following conditions are met.'
        }
      ]
    }
  ]
});

const sampleDetailJson = JSON.stringify({
  law_info: {
    law_id: 'TEST-LAW',
    law_num: 'Law No. 1',
    law_type: 'Act',
    promulgation_date: '2020-01-01'
  },
  revision_info: {
    law_title: 'Test Law'
  },
  law_full_text: {
    tag: 'Law',
    children: [
      {
        tag: 'LawBody',
        children: [
          {
            tag: 'MainProvision',
            children: [
              {
                tag: 'Article',
                attr: { Num: '第1条' },
                children: [
                  { tag: 'ArticleTitle', children: ['第一条'] },
                  {
                    tag: 'Paragraph',
                    attr: { Num: '1' },
                    children: [
                      {
                        tag: 'ParagraphSentence',
                        children: ['This law explains the purpose.']
                      }
                    ]
                  }
                ]
              },
              {
                tag: 'Article',
                attr: { Num: '第2条' },
                children: [
                  { tag: 'ArticleTitle', children: ['第二条'] },
                  {
                    tag: 'Paragraph',
                    attr: { Num: '1' },
                    children: [
                      {
                        tag: 'ParagraphSentence',
                        children: ['This law applies when the following conditions are met.']
                      },
                      {
                        tag: 'Item',
                        attr: { Num: '1' },
                        children: [
                          {
                            tag: 'ItemSentence',
                            children: ['First condition is satisfied.']
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
});

const createResponse = (body: string, status = 200): Response =>
  new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
