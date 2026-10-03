import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";

// Embedded SQLite user store using Node's built-in `node:sqlite` module
// (no native dependencies required). The database file lives in DATA_DIR
// (default `./data`; `/app/data` inside Docker, persisted via a volume).

export type UserRow = {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
  vault_id: string;
  address_id: string;
  did: string;
  mandate_json: string | null;
  mandate_revision: number;
};

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;

  const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
  mkdirSync(dataDir, { recursive: true });

  db = new DatabaseSync(path.join(dataDir, "scout.db"));
  db.exec("PRAGMA journal_mode = WAL;");
  initializeSchema(db);
  return db;
}

export function initializeSchema(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  const columns = database.prepare("PRAGMA table_info(users)").all().map(row => row.name);
  for (const [name, definition] of [
    ["vault_id", "TEXT NOT NULL DEFAULT ''"], ["address_id", "TEXT NOT NULL DEFAULT ''"],
    ["did", "TEXT NOT NULL DEFAULT ''"],
    ["mandate_json", "TEXT"], ["mandate_revision", "INTEGER NOT NULL DEFAULT 0"],
  ]) {
    if (!columns.includes(name)) database.exec(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
  }
  database.exec(`
    UPDATE users SET vault_id = 'vault_legacy_' || id WHERE vault_id = '';
    UPDATE users SET address_id = 'address_legacy_' || id WHERE address_id = '';
    UPDATE users SET did = 'did:mock:' || id WHERE did = '';
    CREATE TABLE IF NOT EXISTS orders (
      key TEXT PRIMARY KEY, user_id INTEGER NOT NULL, trace_id TEXT NOT NULL,
      request_id TEXT NOT NULL, goal_id TEXT NOT NULL, skus TEXT NOT NULL,
      cash_cents INTEGER NOT NULL, cashback_cents INTEGER NOT NULL,
      paid_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS orders_user_time ON orders(user_id, paid_at);
    CREATE TABLE IF NOT EXISTS shopping_requests (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS attempts (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, payload TEXT NOT NULL);
  `);
}

export async function createUser(
  email: string,
  name: string,
  passwordHash: string,
  database: DatabaseSync = getDb(),
): Promise<UserRow> {

  const result = database
    .prepare("INSERT INTO users (email, name, password_hash, vault_id, address_id, did) VALUES (?, ?, ?, ?, ?, ?)")
    .run(email, name, passwordHash, `vault_${randomUUID()}`, `address_${randomUUID()}`, "");
  const id = Number(result.lastInsertRowid);
  database.prepare("UPDATE users SET did = ? WHERE id = ?").run(`did:mock:${id}`, id);

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
