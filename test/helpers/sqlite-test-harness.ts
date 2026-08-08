import Database from "better-sqlite3";

export function withSqliteTestDatabase<T>(databasePath: string, action: (database: Database.Database) => T): T {
  const database = new Database(databasePath, { fileMustExist: true, timeout: 0 });
  try {
    return action(database);
  } finally {
    database.close();
  }
}
