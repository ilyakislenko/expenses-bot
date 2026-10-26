require('dotenv').config();
const { execFile } = require('child_process');
const path = require('path');

// Проверяем наличие DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required in .env file');
  process.exit(1);
}

// Путь к файлу миграции
const migrationFile = path.join(__dirname, 'migrations', 'update.sql');

// ON_ERROR_STOP: psql завершается с ошибкой на первой ошибке SQL; -1: миграция целиком в одной транзакции.
// DATABASE_URL (с паролем) не логируем и не передаём через shell.
const args = [process.env.DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-1', '-f', migrationFile];

console.log(`Running migration ${path.basename(migrationFile)}...`);

execFile('psql', args, (error, stdout, stderr) => {
  if (stdout) {
    console.log('Migration result:', stdout);
  }

  if (stderr) {
    console.log('Migration output:', stderr);
  }

  if (error) {
    console.error(`Migration failed (psql exit code ${error.code}), changes rolled back`);
    process.exit(1);
  }

  console.log('Migration completed successfully!');
});
