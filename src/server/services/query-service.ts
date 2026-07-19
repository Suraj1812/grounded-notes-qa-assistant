import type { Citation } from '../../shared/api';
import { conversationReply } from '../../shared/conversation';
import { Retriever } from '../retrieval/retriever';
import type { AnswerGenerator, QueryResult, RetrievedChunk } from '../types/domain';

export const NO_INFORMATION_ANSWER = "I don't have information about that in the notes.";

function toCitation(chunk: RetrievedChunk): Citation {
  const compact = chunk.content.replace(/\s+/g, ' ').trim();
  return {
    filename: chunk.filename,
    heading: chunk.heading,
    snippet: compact.length > 360 ? `${compact.slice(0, 357).trimEnd()}…` : compact,
    score: Number(chunk.score.toFixed(3)),
    startLine: chunk.startLine,
    endLine: chunk.endLine,
  };
}

function citedChunks(answer: string, chunks: RetrievedChunk[]): RetrievedChunk[] {
  const citedNumbers = new Set<number>();
  for (const match of answer.matchAll(/\[([0-9]+(?:\s*,\s*[0-9]+)*)\]/g)) {
    for (const value of match[1].split(',')) {
      const citationNumber = Number(value.trim());
      if (citationNumber >= 1 && citationNumber <= chunks.length) {
        citedNumbers.add(citationNumber);
      }
    }
  }

  return citedNumbers.size === 0
    ? chunks
    : chunks.filter((_, index) => citedNumbers.has(index + 1));
}

export class QueryService {
  constructor(
    private readonly retriever: Retriever,
    private readonly answerGenerator: AnswerGenerator,
    private readonly similarityThreshold: number,
    private readonly maxContextChunks = 3,
  ) {}

  async query(question: string): Promise<QueryResult> {
    const conversationalAnswer = conversationReply(question);
    if (conversationalAnswer) {
      return { answer: conversationalAnswer, citations: [], refused: false };
    }

    const candidates = this.retriever.search(
      question,
      this.maxContextChunks,
      this.similarityThreshold,
    );
    const relevant = candidates.filter((chunk) => chunk.score >= this.similarityThreshold);

    if (relevant.length === 0) {
      return { answer: NO_INFORMATION_ANSWER, citations: [], refused: true };
    }

    const answer = await this.answerGenerator.generate(question, relevant);
    if (answer.toLowerCase().startsWith("i don't know")) {
      return { answer: NO_INFORMATION_ANSWER, citations: [], refused: true };
    }

    return {
      answer,
      citations: citedChunks(answer, relevant).map(toCitation),
      refused: false,
    };
  }
}
