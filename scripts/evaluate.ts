import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { environment } from '../src/server/config/environment';
import { NotesDatabase } from '../src/server/database/notes-database';
import { Retriever } from '../src/server/retrieval/retriever';
import { ingestNotes } from '../src/server/services/ingestion-service';
import { QueryService } from '../src/server/services/query-service';
import type { AnswerGenerator } from '../src/server/types/domain';

type EvaluationCase = {
  question: string;
  expectedFile: string | null;
};

const cases: EvaluationCase[] = [
  { question: 'What did we decide about caching?', expectedFile: 'q2-planning.md' },
  { question: 'How long do cached dashboard summaries live?', expectedFile: 'q2-planning.md' },
  { question: 'How do employees sign in?', expectedFile: 'security-review.md' },
  { question: 'How long are audit logs retained?', expectedFile: 'security-review.md' },
  { question: 'Why did the pilot launch move to 15 July?', expectedFile: 'launch-retrospective.md' },
  { question: 'What is the office lunch menu on Fridays?', expectedFile: null },
  { question: 'Who won the company football tournament?', expectedFile: null },
  { question: 'What color is the new company logo?', expectedFile: null },
];

const fixtureFilenames = [
  'launch-retrospective.md',
  'q2-planning.md',
  'security-review.md',
];

const evaluationGenerator: AnswerGenerator = {
  async generate(_question, chunks) {
    return `The answer is supported by the retrieved note [1]: ${chunks[0].content.slice(0, 120)}…`;
  },
};

const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'notes-qa-eval-'));
const evaluationNotesDirectory = path.join(temporaryDirectory, 'notes');
const database = new NotesDatabase(path.join(temporaryDirectory, 'evaluation.db'));

try {
  await fs.mkdir(evaluationNotesDirectory);
  await Promise.all(fixtureFilenames.map((filename) => fs.copyFile(
    path.join(environment.projectRoot, 'fixtures/notes', filename),
    path.join(evaluationNotesDirectory, filename),
  )));
  await ingestNotes(evaluationNotesDirectory, database);
  const service = new QueryService(
    new Retriever(database),
    evaluationGenerator,
    environment.similarityThreshold,
    environment.maxContextChunks,
  );

  const lines: string[] = [
    'Notes Q&A Assistant — Evaluation',
    `Run: ${new Date().toISOString()}`,
    `Threshold: ${environment.similarityThreshold}`,
    '',
  ];
  let passed = 0;

  for (const [index, item] of cases.entries()) {
    const result = await service.query(item.question);
    const didReturnAnswer = !result.refused && result.answer.length > 0;
    const citedCorrectFile = item.expectedFile
      ? result.citations.some((citation) => citation.filename === item.expectedFile)
      : result.citations.length === 0;
    const refusedCorrectly = item.expectedFile ? !result.refused : result.refused;
    const casePassed = item.expectedFile
      ? didReturnAnswer && citedCorrectFile && refusedCorrectly
      : !didReturnAnswer && citedCorrectFile && refusedCorrectly;
    if (casePassed) passed += 1;

    lines.push(`${casePassed ? 'PASS' : 'FAIL'} ${index + 1}. ${item.question}`);
    lines.push(`  returned answer: ${didReturnAnswer ? 'yes' : 'no'}`);
    lines.push(`  correct citation: ${citedCorrectFile ? 'yes' : 'no'}${item.expectedFile ? ` (${item.expectedFile})` : ''}`);
    lines.push(`  correct refusal: ${refusedCorrectly ? 'yes' : 'no'}`);
  }

  lines.push('', `Summary: ${passed}/${cases.length} passed`);
  const output = `${lines.join('\n')}\n`;
  console.log(output);
  await fs.writeFile(path.join(environment.projectRoot, 'evaluation-results.txt'), output, 'utf8');
  if (passed !== cases.length) process.exitCode = 1;
} finally {
  database.close();
  await fs.rm(temporaryDirectory, { recursive: true, force: true });
}
