/* Fills the database with the demo company (npm run db:seed). WIPES THE DATABASE first. */
import { db } from "../src/lib/db";
import { seedDemo } from "../src/lib/demo/seed";

seedDemo()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
