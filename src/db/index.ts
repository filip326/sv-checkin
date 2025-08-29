import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import { fromISOTimestamp } from "../utils/dates";

const db = drizzle({
    connection: {
        source: process.env.DB_FILENAME!,
    },

    schema: {
        ...schema,
    },
});

// tokens shall be deleted when expired
setInterval(async () => {
    const existingTokens = await db.query.tokens.findMany({ columns: { id: true, expiresAt: true } });

    const now = new Date();
    for (const token of existingTokens) {
        if (fromISOTimestamp(token.expiresAt) < now) {
          db.delete(schema.tokens).where(eq(schema.tokens.id, token.id));
        }
    }
}, 15 * 60 * 1_000); // one hour

export default db;
