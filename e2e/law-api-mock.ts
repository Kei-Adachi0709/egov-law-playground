import type { Page, Route } from '@playwright/test';

const SEARCH_RESPONSE = JSON.stringify({
  total_count: 1,
  sentence_count: 1,
  next_offset: null,
  items: [
    {
      law_info: {
        law_type: 'Act',
        law_id: 'TEST-LAW-001',
        law_num: '令和元年法律第1号',
        promulgation_date: '2020-01-01'
      },
      revision_info: {
        law_title: 'テスト行政手続法',
        law_type: 'Act',
        category: '行政手続'
      },
      sentences: [
        {
          position: 'mainprovision',
          text: 'この法律はハイライト用キーワードを含む条文です。'
        }
      ]
    }
  ]
});

const DETAIL_RESPONSE = JSON.stringify({
  law_info: {
    law_id: 'TEST-LAW-001',
    law_num: '令和元年法律第1号',
    law_type: '行政法',
    promulgation_date: '2020-01-01'
  },
  revision_info: {
    law_title: 'テスト行政手続法'
  },
  law_full_text: {
    tag: 'Law',
    attr: {},
    children: [
      {
        tag: 'LawBody',
        attr: {},
        children: [
          {
            tag: 'MainProvision',
            children: [
              {
                tag: 'Article',
                attr: { Num: '1' },
                children: [
                  { tag: 'ArticleTitle', children: ['第一条'] },
                  {
                    tag: 'Paragraph',
                    attr: { Num: '1' },
                    children: [
                      {
                        tag: 'ParagraphSentence',
                        children: ['この法律はハイライト用キーワードを含む条文です。']
                      }
                    ]
                  }
                ]
              },
              {
                tag: 'Article',
                attr: { Num: '2' },
                children: [
                  { tag: 'ArticleTitle', children: ['第二条'] },
                  {
                    tag: 'Paragraph',
                    attr: { Num: '1' },
                    children: [
                      {
                        tag: 'ParagraphSentence',
                        children: ['カード表示と詳細表示を確認するためのサンプル条文です。']
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

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8'
} as const;

const fulfillWithJson = async (route: Route, body: string) => {
  await route.fulfill({ status: 200, headers: JSON_HEADERS, body });
};

export const setupLawApiMocks = async (page: Page): Promise<void> => {
  await page.route('**/api/2/law_data/**', (route) => fulfillWithJson(route, DETAIL_RESPONSE));
  await page.route('**/api/2/keyword**', (route) => fulfillWithJson(route, SEARCH_RESPONSE));
};
