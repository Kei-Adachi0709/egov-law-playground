import type { Article, Item, Paragraph, Provision } from '../../types/law';
import { ensureArray, getFirstMatchingKey, normalizeWhitespace } from './xml';

interface LawBodyTransformResult {
  articles: Article[];
  provisions: Provision[];
}

const ARTICLE_KEYS = ['Article', 'article'];
const ARTICLE_NUMBER_KEYS = ['ArticleNumber', 'articleNumber', 'ArticleNum', 'articleNum'];
const ARTICLE_TITLE_KEYS = ['ArticleTitle', 'articleTitle'];
const PARAGRAPH_KEYS = ['Paragraph', 'paragraph'];
const PARAGRAPH_NUMBER_KEYS = ['ParagraphNumber', 'paragraphNumber', 'ParagraphNum', 'paragraphNum'];
const PARAGRAPH_TEXT_KEYS = ['ParagraphSentence', 'paragraphSentence', 'ParagraphText', 'paragraphText'];
const ITEM_KEYS = ['Item', 'item'];
const ITEM_NUMBER_KEYS = ['ItemNumber', 'itemNumber', 'ItemNum', 'itemNum'];
const ITEM_TEXT_KEYS = ['ItemSentence', 'itemSentence', 'ItemText', 'itemText'];
const SENTENCE_KEYS = ['Sentence', 'sentence'];

export const transformLawBody = (lawId: string, lawBody: unknown): LawBodyTransformResult => {
  const articlesRaw = ensureArray(getFirstMatchingKey(lawBody, ARTICLE_KEYS));
  const articles: Article[] = [];
  const provisions: Provision[] = [];

  articlesRaw.forEach((articleRaw) => {
    const articleNumber = toStringValue(getFirstMatchingKey(articleRaw, ARTICLE_NUMBER_KEYS)) || '無題';
    const articleTitle = toStringValue(getFirstMatchingKey(articleRaw, ARTICLE_TITLE_KEYS));
    const paragraphsRaw = ensureArray(getFirstMatchingKey(articleRaw, PARAGRAPH_KEYS));
    const paragraphs: Paragraph[] = paragraphsRaw.map((paragraphRaw) => {
      const paragraphNumber = toStringValue(getFirstMatchingKey(paragraphRaw, PARAGRAPH_NUMBER_KEYS)) || '1';
      const paragraphText = extractSentence(paragraphRaw, PARAGRAPH_TEXT_KEYS);
      const itemsRaw = ensureArray(getFirstMatchingKey(paragraphRaw, ITEM_KEYS));
      const items: Item[] = itemsRaw.map((itemRaw) => {
        const itemNumber = toStringValue(getFirstMatchingKey(itemRaw, ITEM_NUMBER_KEYS)) || '1';
        const itemText = extractSentence(itemRaw, ITEM_TEXT_KEYS);
        const provision: Provision = {
          lawId,
          articleNumber,
          paragraphNumber,
          itemNumber,
          text: itemText,
          path: buildPath(articleNumber, paragraphNumber, itemNumber)
        };
        provisions.push(provision);
        return { itemNumber, text: itemText };
      });

      if (!items.length) {
        provisions.push({
          lawId,
          articleNumber,
          paragraphNumber,
          text: paragraphText,
          path: buildPath(articleNumber, paragraphNumber)
        });
      } else if (paragraphText) {
        // Paragraph text may provide overview before items; keep as separate provision.
        provisions.push({
          lawId,
          articleNumber,
          paragraphNumber,
          text: paragraphText,
          path: buildPath(articleNumber, paragraphNumber)
        });
      }

      return {
        paragraphNumber,
        text: paragraphText,
        items
      };
    });

    if (!paragraphs.length) {
      provisions.push({
        lawId,
        articleNumber,
        text: articleTitle ?? articleNumber,
        path: buildPath(articleNumber)
      });
    }

    articles.push({
      articleNumber,
      articleTitle,
      paragraphs
    });
  });

  return { articles, provisions: dedupeProvisions(provisions) };
};

const extractSentence = (source: unknown, keys: string[]): string => {
  const value = getFirstMatchingKey(source, keys);
  if (typeof value === 'string') {
    return normalizeWhitespace(value);
  }
  if (typeof value === 'object' && value !== null) {
    const nested = getFirstMatchingKey(value, SENTENCE_KEYS);
    if (typeof nested === 'string') {
      return normalizeWhitespace(nested);
    }
  }
  return '';
};

const toStringValue = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  return String(value).trim();
};

const buildPath = (article: string, paragraph?: string, item?: string): string => {
  const parts = [article];
  if (paragraph) {
    parts.push(`第${paragraph}項`);
  }
  if (item) {
    parts.push(`第${item}号`);
  }
  return parts.join(' ');
};

const dedupeProvisions = (list: Provision[]): Provision[] => {
  const seen = new Set<string>();
  return list.filter((entry) => {
    const key = `${entry.path}:${entry.text}`;
    if (seen.has(key) || !entry.text) {
      return false;
    }
    seen.add(key);
    return true;
  });
};
