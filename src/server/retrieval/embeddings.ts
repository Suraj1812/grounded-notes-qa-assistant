export type SerializedEmbeddingModel = {
  vocabulary: string[];
  idf: number[];
};

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'did', 'do', 'does', 'for', 'from',
  'had', 'has', 'have', 'how', 'i', 'in', 'is', 'it', 'of', 'on', 'or', 'our', 'that',
  'the', 'their', 'this', 'to', 'was', 'we', 'were', 'what', 'when', 'where', 'which',
  'who', 'why', 'will', 'with', 'you', 'your',
]);

export function tokenize(text: string): string[] {
  const words = (text.toLocaleLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}_'-]*/gu) ?? [])
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
  const normalized = words.map(normalizeEnglishInflection);
  const bigrams = normalized.slice(1).map((word, index) => `${normalized[index]}_${word}`);
  return [...normalized, ...bigrams];
}

function normalizeEnglishInflection(word: string): string {
  if (!/^[a-z]+$/.test(word) || word.length < 4) return word;
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith('sses')) return word.slice(0, -2);
  if (word.endsWith('ed') && word.length > 5) {
    let stem = word.slice(0, -2);
    if (stem.at(-1) === stem.at(-2)) stem = stem.slice(0, -1);
    if (stem.endsWith('cach') || stem.endsWith('decid') || stem.endsWith('mov')) stem += 'e';
    return stem;
  }
  if (word.endsWith('ing') && word.length > 6) {
    let stem = word.slice(0, -3);
    if (stem.at(-1) === stem.at(-2)) stem = stem.slice(0, -1);
    if (stem.endsWith('cach') || stem.endsWith('mov') || stem.endsWith('us')) stem += 'e';
    return stem;
  }
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 4) return word.slice(0, -1);
  return word;
}

export class TfidfEmbeddingModel {
  private readonly index: Map<string, number>;

  constructor(
    readonly vocabulary: string[],
    readonly idf: number[],
  ) {
    if (vocabulary.length !== idf.length) throw new Error('Vocabulary and IDF lengths differ');
    this.index = new Map(vocabulary.map((term, index) => [term, index]));
  }

  static fit(documents: string[], maxFeatures = 2048): TfidfEmbeddingModel {
    const documentFrequency = new Map<string, number>();

    for (const document of documents) {
      for (const term of new Set(tokenize(document))) {
        documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
      }
    }

    const vocabulary = [...documentFrequency.entries()]
      .sort(([termA, frequencyA], [termB, frequencyB]) =>
        frequencyB - frequencyA || termA.localeCompare(termB))
      .slice(0, maxFeatures)
      .map(([term]) => term);
    const count = Math.max(1, documents.length);
    const idf = vocabulary.map((term) => Math.log((1 + count) / (1 + (documentFrequency.get(term) ?? 0))) + 1);
    return new TfidfEmbeddingModel(vocabulary, idf);
  }

  static fromJSON(value: SerializedEmbeddingModel): TfidfEmbeddingModel {
    return new TfidfEmbeddingModel(value.vocabulary, value.idf);
  }

  toJSON(): SerializedEmbeddingModel {
    return { vocabulary: this.vocabulary, idf: this.idf };
  }

  embed(text: string): number[] {
    const counts = new Map<string, number>();
    for (const term of tokenize(text)) counts.set(term, (counts.get(term) ?? 0) + 1);

    const vector = Array.from({ length: this.vocabulary.length }, () => 0);
    for (const [term, count] of counts) {
      const index = this.index.get(term);
      if (index === undefined) continue;
      vector[index] = (1 + Math.log(count)) * this.idf[index];
    }

    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    return norm === 0 ? vector : vector.map((value) => value / norm);
  }
}

export function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length !== right.length) return 0;
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}
