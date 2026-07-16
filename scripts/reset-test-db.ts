import postgres from "postgres";

const DEFAULT_ADMIN_URL = "postgresql://kiyota:kiyota@localhost:5432/postgres";
const TEST_DB = "kiyota_test";

async function main() {
  const adminUrl = process.env.KEYSTONE_ADMIN_DATABASE_URL || DEFAULT_ADMIN_URL;
  const sql = postgres(adminUrl, { max: 1, idle_timeout: 5, connect_timeout: 10 });
  try {
    await sql`DROP DATABASE IF EXISTS ${sql(TEST_DB)}`;
    await sql`CREATE DATABASE ${sql(TEST_DB)} OWNER kiyota`;
    console.log(`Test database ${TEST_DB} reset.`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
