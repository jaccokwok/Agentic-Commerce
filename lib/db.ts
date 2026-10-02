import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

// Embedded SQLite user store using Node's built-in `node:sqlite` module
// (no native dependencies required). The database file lives in DATA_DIR
// (default `./data`; `/app/data` inside Docker, persisted via a volume).

export type UserRow = {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
};

let db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (db) return db;

  const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
  mkdirSync(dataDir, { recursive: true });

  db = new DatabaseSync(path.join(dataDir, "scout.db"));
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return db;
}

export async function createUser(
  email: string,
  name: string,
  passwordHash: string,
): Promise<UserRow> {
  const database = getDb();

  const result = database
    .prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)")
    .run(email, name, passwordHash);

  return database
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(Number(result.lastInsertRowid)) as UserRow;
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const row = getDb()
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.toLowerCase());
  return (row as UserRow | undefined) ?? null;
}

export async function getUserById(id: number): Promise<UserRow | null> {
  const row = getDb().prepare("SELECT * FROM users WHERE id = ?").get(id);
  return (row as UserRow | undefined) ?? null;
}
