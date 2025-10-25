const normalizeUnits = (text: string, caseSensitive: boolean) => {
  const units: string[] = [];
  const positions: Array<{ start: number; end: number }> = [];
  let cursor = 0;

  for (const char of text) {
    const start = cursor;
    cursor += char.length;
    const normalized = char.normalize('NFKC');
    for (const unit of [...normalized]) {
      units.push(caseSensitive ? unit : unit.toLocaleLowerCase('ja-JP'));
      positions.push({ start, end: cursor });
    }
  }

  return { units, positions };
};

const normalizeKeyword = (keyword: string, caseSensitive: boolean): string => {
  const units = [...keyword.normalize('NFKC')];
  return (caseSensitive ? units : units.map((unit) => unit.toLocaleLowerCase('ja-JP'))).join('');
};

const isAsciiWordChar = (unit: string | undefined): boolean => {
  if (!unit?.length) {
    return false;
  }
  return /[0-9A-Za-z_]/.test(unit);
};

export interface HighlightOptions {
  caseSensitive?: boolean;
  boundary?: 'none' | 'word';
  maxMatches?: number;
}

export const highlightKeyword = (text: string, keyword: string, options: HighlightOptions = {}): string => {
  if (!text || !keyword.trim()) {
    return text;
  }

  const caseSensitive = options.caseSensitive ?? false;
  const boundary = options.boundary ?? 'none';
  const maxMatches = options.maxMatches ?? Number.POSITIVE_INFINITY;

  const normalizedKeyword = normalizeKeyword(keyword, caseSensitive);
  if (!normalizedKeyword.length) {
    return text;
  }

  const { units, positions } = normalizeUnits(text, caseSensitive);
  const normalizedText = units.join('');
  const matches: Array<{ start: number; end: number }> = [];
  const keywordLength = normalizedKeyword.length;

  let index = normalizedText.indexOf(normalizedKeyword);
  while (index !== -1 && matches.length < maxMatches) {
    if (boundary === 'word') {
      const before = units[index - 1];
      const after = units[index + keywordLength];
      if (isAsciiWordChar(before) || isAsciiWordChar(after)) {
        index = normalizedText.indexOf(normalizedKeyword, index + Math.max(keywordLength, 1));
        continue;
      }
    }

    const startPosition = positions[index]?.start;
    const endPosition = positions[index + keywordLength - 1]?.end;

    if (startPosition === undefined || endPosition === undefined || startPosition === endPosition) {
      index = normalizedText.indexOf(normalizedKeyword, index + Math.max(keywordLength, 1));
      continue;
    }

    matches.push({ start: startPosition, end: endPosition });
    index = normalizedText.indexOf(normalizedKeyword, index + Math.max(keywordLength, 1));
  }

  if (!matches.length) {
    return text;
  }

  let result = '';
  let cursor = 0;
  matches.forEach(({ start, end }) => {
    if (cursor < start) {
      result += text.slice(cursor, start);
    }
    result += `<mark>${text.slice(start, end)}</mark>`;
    cursor = end;
  });
  result += text.slice(cursor);

  return result;
};

export const highlightKeywords = (text: string, keywords: readonly string[], options: HighlightOptions = {}): string => {
  return keywords.reduce((acc, keyword) => highlightKeyword(acc, keyword, options), text);
};
