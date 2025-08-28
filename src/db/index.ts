import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const db = drizzle({
  connection: {
    source: process.env.DB_FILENAME!,
  },

  schema: {
    ...schema,
  }

});

export default db;