// Prints the SQL that syncs the role/permission catalog from src/lib/rbac.ts.
// Usage: bun scripts/rbac-seed.ts
import { seedSql } from "../src/lib/rbac.ts";
console.log(seedSql());
