require('dotenv').config();
const { exec } = require('child_process');
const path = require('path');

// Проверяем наличие DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required in .env file');
  process.exit(1);
}

// Путь к файлу миграции
const migrationFile = path.join(__dirname, 'migrations', 'update.sql');

// Выполняем миграцию
const command = `psql "${process.env.DATABASE_URL}" -f "${migrationFile}"`;

console.log('Running migration...');
console.log(`Command: ${command}`);

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
  
  if (stderr) {
    console.log('Migration output:', stderr);
  }
  
  if (stdout) {
    console.log('Migration result:', stdout);
  }
  
  console.log('Migration completed successfully!');
}); 