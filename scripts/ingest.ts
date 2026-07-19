import { environment } from '../src/server/config/environment';
import { NotesDatabase } from '../src/server/database/notes-database';
import { ingestNotes } from '../src/server/services/ingestion-service';

const database = new NotesDatabase(environment.databasePath);

try {
  const result = await ingestNotes(environment.notesDirectory, database);
  console.log(`Indexed ${result.notes} notes into ${result.chunks} chunks.`);
} finally {
  database.close();
}
