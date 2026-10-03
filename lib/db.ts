import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export type UserRow = {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
  vault_ref: string | null;
  address_ref: string | null;
};

let db: DatabaseSync | null = null;

export function closeDb() {
  db?.close();
  db = null;
}

function addColumn(database: DatabaseSync, column: string, ddl: string) {
  const rows = database.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (!rows.some((row) => row.name === column)) {
    database.exec(`ALTER TABLE users ADD COLUMN ${column} ${ddl}`);
  }
}

export function getDb(): DatabaseSync {
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
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      vault_ref TEXT,
      address_ref TEXT
    );
  `);
  addColumn(db, "vault_ref", "TEXT");
  addColumn(db, "address_ref", "TEXT");
  db.exec(`
    CREATE TABLE IF NOT EXISTS ledger_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      sku_id TEXT NOT NULL,
      cash_total INTEGER NOT NULL,
      kind TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  return db;
}

function ensureRefs(row: UserRow): UserRow {
  if (row.vault_ref && row.address_ref) return row;
  const vault = row.vault_ref ?? `vault_${randomUUID()}`;
  const address = row.address_ref ?? `addr_${randomUUID()}`;
  getDb()
    .prepare("UPDATE users SET vault_ref = ?, address_ref = ? WHERE id = ?")
    .run(vault, address, row.id);
  return { ...row, vault_ref: vault, address_ref: address };
}

export async function createUser(
  email: string,
  name: string,
  passwordHash: string,
): Promise<UserRow> {
  const database = getDb();
  const vault = `vault_${randomUUID()}`;
  const address = `addr_${randomUUID()}`;

  const result = database
    .prepare(
      "INSERT INTO users (email, name, password_hash, vault_ref, address_ref) VALUES (?, ?, ?, ?, ?)",
    )
    .run(email, name, passwordHash, vault, address);

  return database
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(Number(result.lastInsertRowid)) as UserRow;
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const row = getDb()
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.toLowerCase()) as UserRow | undefined;
  return row ? ensureRefs(row) : null;
}

export async function getUserById(id: number): Promise<UserRow | null> {
  const row = getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  return row ? ensureRefs(row) : null;
}
