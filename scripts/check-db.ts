import { db } from "../src/lib/db";
import { equipment, users } from "../src/lib/db/schema";

async function main() {
  const allUsers = db.select().from(users).all();
  console.log("Users:", JSON.stringify(allUsers, null, 2));

  const allEquipment = db.select().from(equipment).all();
  console.log("Equipment:", JSON.stringify(allEquipment, null, 2));
}

main().catch(console.error);
