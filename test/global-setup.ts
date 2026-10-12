import { execSync } from 'node:child_process';

export default async function globalSetup(): Promise<void> {
  process.env.DATABASE_URL ??=
    'postgresql://catalog:catalog@localhost:5434/catalog_test?schema=public';
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
}
