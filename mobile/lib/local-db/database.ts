import * as SQLite from "expo-sqlite";
import { CREATE_TABLES_SQL } from "./schema";

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Opens (or returns) the singleton SQLite database.
 * Creates all tables and indexes on first open.
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (db) return db;

  db = SQLite.openDatabaseSync("lorgyaya.db");
  db.execSync(CREATE_TABLES_SQL);
  return db;
}

/**
 * Closes the database connection. Called on sign-out
 * to release the file handle.
 */
export function closeDatabase(): void {
  if (db) {
    db.closeSync();
    db = null;
  }
}

/**
 * Deletes the database file. Called on account deletion
 * to remove all local data.
 */
export async function deleteDatabase(): Promise<void> {
  closeDatabase();
  await SQLite.deleteDatabaseAsync("lorgyaya.db");
}
