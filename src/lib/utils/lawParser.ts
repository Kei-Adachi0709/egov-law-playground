import type { Article, Item, Paragraph, Provision } from '../../types/law';
import { ensureArray, getFirstMatchingKey, normalizeWhitespace } from './xml';

interface TaggedNode {
  tag?: string;
  attr?: Record<string, unknown>;
  children?: Array<TaggedNode | string>;
}

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
const SENTENCE_KEYS = ['Sentence', 'sentence', 'text', '#text'];

export const transformLawBody = (lawId: string, lawBody: unknown): LawBodyTransformResult => {
  if (isTaggedNode(lawBody)) {
    return transformTaggedLawBody(lawId, lawBody);
  }
  if (Array.isArray(lawBody)) {
    const tagged = lawBody.find(isTaggedNode);
    if (tagged) {
      return transformTaggedLawBody(lawId, tagged);
    }
  }
  return transformLegacyLawBody(lawId, lawBody);
};

const transformTaggedLawBody = (lawId: string, raw: TaggedNode): LawBodyTransformResult => {
  const lawNode = raw.tag?.toLowerCase() === 'law' ? raw : findFirstChild(raw, 'Law') ?? raw;
  const lawBodyNode = findFirstChild(lawNode, 'LawBody') ?? lawNode;

  const articleNodes = collectDescendantsByTag(lawBodyNode, 'Article');
  const articles: Article[] = [];
  const provisions: Provision[] = [];

  articleNodes.forEach((articleNode) => {
    const articleNumber =
      getFirstTextByTags(articleNode, ['ArticleNumber', 'ArticleNum']) ||
      getAttribute(articleNode, 'Num') ||
      '無題';
    const articleTitle = getFirstTextByTags(articleNode, ['ArticleTitle', 'ArticleCaption']);

    const paragraphNodes = getChildrenByTag(articleNode, 'Paragraph');
    const paragraphs: Paragraph[] = paragraphNodes.map((paragraphNode) => {
      const paragraphNumber =
        getFirstTextByTags(paragraphNode, ['ParagraphNumber', 'ParagraphNum']) ||
        getAttribute(paragraphNode, 'Num') ||
        '1';
      const paragraphText = getParagraphText(paragraphNode);

      const itemNodes = getChildrenByTag(paragraphNode, 'Item');
      const items: Item[] = itemNodes.map((itemNode) => {
        const itemNumber =
          getFirstTextByTags(itemNode, ['ItemNumber', 'ItemNum']) ||
          getAttribute(itemNode, 'Num') ||
          '1';
        const itemText = getItemText(itemNode);
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
      const fallback = articleTitle ?? articleNumber;
      provisions.push({
        lawId,
        articleNumber,
        articleTitle,
        text: fallback,
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

const transformLegacyLawBody = (lawId: string, lawBody: unknown): LawBodyTransformResult => {
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

const getParagraphText = (node: TaggedNode): string => {
  const sentenceNode = findFirstDescendantByTag(node, 'ParagraphSentence') ?? findFirstDescendantByTag(node, 'ParagraphText');
  return normalizeWhitespace(getTextContent(sentenceNode));
};

const getItemText = (node: TaggedNode): string => {
  const sentenceNode = findFirstDescendantByTag(node, 'ItemSentence') ?? findFirstDescendantByTag(node, 'ItemText');
  return normalizeWhitespace(getTextContent(sentenceNode));
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
    parts.push(paragraph.includes('項') ? paragraph : `第${paragraph}項`);
  }
  if (item) {
    parts.push(item.includes('号') ? item : `第${item}号`);
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

const isTaggedNode = (value: unknown): value is TaggedNode =>
  Boolean(value && typeof value === 'object' && ('tag' in (value as Record<string, unknown>) || 'children' in (value as Record<string, unknown>)));

const getChildrenByTag = (node: TaggedNode, tagName: string): TaggedNode[] => {
  const lower = tagName.toLowerCase();
  return ensureArray(node.children)
    .filter(isTaggedNode)
    .filter((child) => child.tag?.toLowerCase() === lower);
};

const collectDescendantsByTag = (node: TaggedNode, tagName: string): TaggedNode[] => {
  const lower = tagName.toLowerCase();
  const results: TaggedNode[] = [];
  const queue: TaggedNode[] = [node];

  while (queue.length) {
    const current = queue.shift()!;
    if (current.tag?.toLowerCase() === lower) {
      results.push(current);
    }
    ensureArray(current.children).forEach((child) => {
      if (isTaggedNode(child)) {
        queue.push(child);
      }
    });
  }

  return results;
};

const findFirstChild = (node: TaggedNode, tagName: string): TaggedNode | undefined => {
  const lower = tagName.toLowerCase();
  return ensureArray(node.children).find((child): child is TaggedNode =>
    isTaggedNode(child) && child.tag?.toLowerCase() === lower
  );
};

const findFirstDescendantByTag = (node: TaggedNode, tagName: string): TaggedNode | undefined => {
  const lower = tagName.toLowerCase();
  const stack: TaggedNode[] = [node];

  while (stack.length) {
    const current = stack.pop()!;
    if (current.tag?.toLowerCase() === lower) {
      return current;
    }
    ensureArray(current.children).forEach((child) => {
      if (isTaggedNode(child)) {
        stack.push(child);
      }
    });
  }

  return undefined;
};

const getTextContent = (value: TaggedNode | string | undefined): string => {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  const segments = ensureArray(value.children).map((child) =>
    typeof child === 'string' ? child : getTextContent(child)
  );
  return segments.join(' ');
};

const getAttribute = (node: TaggedNode, key: string): string | undefined => {
  const raw = node.attr?.[key];
  return raw === undefined ? undefined : String(raw).trim();
};

const getFirstTextByTags = (node: TaggedNode, tagNames: string[]): string | undefined => {
  for (const tag of tagNames) {
    const child = findFirstDescendantByTag(node, tag);
    if (child) {
      const text = normalizeWhitespace(getTextContent(child));
      if (text) {
        return text;
      }
    }
  }
  return undefined;
};
