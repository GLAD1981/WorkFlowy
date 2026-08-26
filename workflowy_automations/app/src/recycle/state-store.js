const { DatabaseSync } = require('node:sqlite');

function createStateStore(filename) {
  const database = new DatabaseSync(filename);
  database.exec('CREATE TABLE IF NOT EXISTS runs (date TEXT PRIMARY KEY, status TEXT NOT NULL, count INTEGER, error TEXT, finished_at TEXT NOT NULL)');
  const saveRun = database.prepare('INSERT OR REPLACE INTO runs (date, status, count, error, finished_at) VALUES (?, ?, ?, ?, ?)');
  const lastSuccess = database.prepare('SELECT date FROM runs WHERE status = \'success\' ORDER BY finished_at DESC LIMIT 1');
  const latestRun = database.prepare('SELECT date, status, count, error, finished_at FROM runs ORDER BY finished_at DESC LIMIT 1');
  return {
    getLastSuccessDate() { return lastSuccess.get()?.date ?? null; },
    recordSuccess({ date, count, finishedAt }) { saveRun.run(date, 'success', count, null, finishedAt); },
    recordFailure({ date, message, finishedAt }) { saveRun.run(date, 'failure', null, message, finishedAt); },
    getStatus() { const row = latestRun.get(); return row ? { date: row.date, status: row.status, count: row.count, error: row.error, finishedAt: row.finished_at } : null; },
    close() { database.close(); }
  };
}

module.exports = { createStateStore };
