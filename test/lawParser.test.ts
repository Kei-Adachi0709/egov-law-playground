/// <reference path="./vitest-globals.d.ts" />

import { transformLawBody } from '../src/lib/utils/lawParser';

describe('lawParser', () => {
  it('extracts provisions from nested law body structure', () => {
    const body = {
      Article: [
        {
          ArticleNumber: '第1条',
          ArticleTitle: '目的',
          Paragraph: [
            {
              ParagraphNumber: '1',
              ParagraphSentence: {
                Sentence: 'この法律は目的を定める。'
              }
            },
            {
              ParagraphNumber: '2',
              ParagraphSentence: '前項の規定は次の各号に掲げる場合に適用する。',
              Item: [
                {
                  ItemNumber: '一',
                  ItemSentence: {
                    Sentence: '第一の条件を満たすとき。'
                  }
                },
                {
                  ItemNumber: '二',
                  ItemSentence: '第二の条件を満たすとき。'
                }
              ]
            }
          ]
        }
      ]
    };

    const { articles, provisions } = transformLawBody('TEST-LAW', body);

    expect(articles).toHaveLength(1);
    expect(articles[0].paragraphs).toHaveLength(2);
    expect(provisions).toHaveLength(4);
    expect(provisions[0]).toMatchObject({
      lawId: 'TEST-LAW',
      articleNumber: '第1条'
    });
    expect(provisions[2].path).toContain('第二号');
  });

  it('returns empty structures when body is missing', () => {
    const { articles, provisions } = transformLawBody('TEST-LAW', undefined);
    expect(articles).toEqual([]);
    expect(provisions).toEqual([]);
  });
});
