/**
 * Creates the initial admin user.
 *
 * Usage:
 *   npm run db:seed
 *
 * Environment variables (set in .env.local or pass inline):
 *   SEED_EMAIL    — defaults to admin@localhost
 *   SEED_PASSWORD — defaults to changeme
 */
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";

async function seed() {
  const email = process.env.SEED_EMAIL ?? "admin@localhost";
  const password = process.env.SEED_PASSWORD ?? "changeme";

  const hashedPassword = await bcrypt.hash(password, 12);

  db.insert(users)
    .values({ email, hashedPassword, name: "Admin" })
    .run();

  console.log(`User created: ${email}`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
