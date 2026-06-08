import path from 'path';
import dotenv from 'dotenv';

[
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'src', '.env'),
  path.resolve(process.cwd(), '..', '.env'),
].forEach((envPath) => {
  dotenv.config({ path: envPath, quiet: true });
});

process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://user:password@localhost:5432/atvos_test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'jwt-secret-test-suite';
