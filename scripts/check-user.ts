import { getCurrentUser } from "../src/lib/auth/current-user";

async function main() {
  const user = await getCurrentUser();
  console.log("Current User:", JSON.stringify(user, null, 2));
}

main().catch(console.error);
