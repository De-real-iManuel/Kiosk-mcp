import { pool } from "../index.js";
import { seedCategories } from "./categories.js";
import { seedBusinesses } from "./businesses.js";

async function main(): Promise<void> {
  try {
    console.log("Running database seeds...\n");

    await seedCategories();
    await seedBusinesses();

    console.log("\n? All seeds completed successfully.");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
