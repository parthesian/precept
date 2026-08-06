import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL ?? "postgres://precept:precept@localhost:5432/precept";
  const sql = postgres(url, { max: 1 });
  await sql`DROP SCHEMA public CASCADE`;
  await sql`CREATE SCHEMA public`;
  await sql.end();
  console.log("database reset");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
