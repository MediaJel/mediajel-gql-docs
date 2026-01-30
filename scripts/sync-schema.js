/**
 * Sync public schema and config from the GQL service into the docs app.
 * Run at build time: `npm run sync-schema`
 */
const fs = require("fs");
const path = require("path");

const GQL_SERVICE_DIR = path.resolve(__dirname, "../../mediajel-gql-service");
const PUBLIC_API_DIR = path.join(GQL_SERVICE_DIR, "src/webapp/public-api");
const DEST_DIR = path.resolve(__dirname, "../src/content");

const FILES_TO_SYNC = [
  "public-schema.graphql",
  "public-api-config.json",
];

// Ensure destination directory exists
if (!fs.existsSync(DEST_DIR)) {
  fs.mkdirSync(DEST_DIR, { recursive: true });
}

for (const file of FILES_TO_SYNC) {
  const src = path.join(PUBLIC_API_DIR, file);
  const dest = path.join(DEST_DIR, file);

  if (!fs.existsSync(src)) {
    console.error(`Source file not found: ${src}`);
    console.error("Make sure mediajel-gql-service/src/webapp/public-api/ exists.");
    process.exit(1);
  }

  fs.copyFileSync(src, dest);
  console.log(`Synced: ${file}`);
}

console.log("Schema sync complete.");
