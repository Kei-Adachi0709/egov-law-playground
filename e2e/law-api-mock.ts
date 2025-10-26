import type { Page, Route } from '@playwright/test';

const SEARCH_RESPONSE = `<?xml version="1.0" encoding="UTF-8"?>
<eGovLawSearchResult>
  <result>
    <numberOfResults>1</numberOfResults>
    <page>1</page>
    <numberOfRecords>1</numberOfRecords>
  </result>
  <laws>
    <law>
      <lawId>TEST-LAW-001</lawId>
      <lawName>テスト行政手続法</lawName>
      <lawNo>令和元年法律第1号</lawNo>
      <promulgationDate>2020-01-01</promulgationDate>
      <lawType>行政法</lawType>
    </law>
  </laws>
</eGovLawSearchResult>`;

const DETAIL_RESPONSE = `<?xml version="1.0" encoding="UTF-8"?>
<eGovLawDetail>
  <law>
    <lawId>TEST-LAW-001</lawId>
    <lawName>テスト行政手続法</lawName>
    <lawNo>令和元年法律第1号</lawNo>
    <promulgationDate>2020-01-01</promulgationDate>
    <lawType>行政法</lawType>
    <lawBody>
      <Article>
        <ArticleNumber>第一条</ArticleNumber>
        <Paragraph>
          <ParagraphNumber>1</ParagraphNumber>
          <ParagraphSentence>この法律はハイライト用キーワードを含む条文です。</ParagraphSentence>
        </Paragraph>
      </Article>
      <Article>
        <ArticleNumber>第二条</ArticleNumber>
        <Paragraph>
          <ParagraphNumber>1</ParagraphNumber>
          <ParagraphSentence>カード表示と詳細表示を確認するためのサンプル条文です。</ParagraphSentence>
        </Paragraph>
      </Article>
    </lawBody>
  </law>
</eGovLawDetail>`;

const XML_HEADERS = {
  'content-type': 'application/xml; charset=utf-8'
} as const;

const fulfillWithXml = async (route: Route, body: string) => {
  await route.fulfill({ status: 200, headers: XML_HEADERS, body });
};

export const setupLawApiMocks = async (page: Page): Promise<void> => {
  await page.route('**/elaws/api/v1/laws/search**', (route) => fulfillWithXml(route, SEARCH_RESPONSE));
  await page.route('**/elaws/api/v1/laws/**', (route) => fulfillWithXml(route, DETAIL_RESPONSE));
};
