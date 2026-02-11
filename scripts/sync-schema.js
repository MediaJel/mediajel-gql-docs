/**
 * Sync public schema and config from S3 or local filesystem into the docs app.
 * Run at build time: `npm run sync-schema`
 *
 * Environment variables:
 * - SCHEMA_SOURCE: "s3" (default) or "local" for development
 * - CREATIVE_BUCKET_NAME: S3 bucket name (e.g., "mj-creatives")
 * - CREATIVE_BUCKET_REGION: AWS region (default: "us-west-2")
 * - PUBLIC_API_SCHEMA_NAME: Directory name in S3 (default: "public-api-schema")
 *
 * S3 path: s3://{CREATIVE_BUCKET_NAME}/{PUBLIC_API_SCHEMA_NAME}/{filename}
 */
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");

const BUCKET_NAME = process.env.CREATIVE_BUCKET_NAME;
const BUCKET_REGION = process.env.CREATIVE_BUCKET_REGION || "us-east-1";
const SCHEMA_DIR = process.env.PUBLIC_API_SCHEMA_NAME || "public-api-schema";
const SCHEMA_SOURCE = process.env.SCHEMA_SOURCE || "s3";
const DEST_DIR = path.resolve(__dirname, "../src/content");
const FILES = ["public-schema.graphql", "public-api-config.json"];

// Local fallback paths (for development without S3)
const LOCAL_DIR = path.resolve(
  __dirname,
  "../../mediajel-gql-service/src/webapp/public-api",
);

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

async function downloadFromS3(fileName) {
  const client = new S3Client({ region: BUCKET_REGION });
  const key = `${SCHEMA_DIR}/${fileName}`;
  const response = await client.send(
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }),
  );
  return streamToString(response.Body);
}

async function main() {
  // Ensure destination directory exists
  if (!fs.existsSync(DEST_DIR)) {
    fs.mkdirSync(DEST_DIR, { recursive: true });
  }

  const useS3 = SCHEMA_SOURCE === "s3" && BUCKET_NAME;
  console.log(
    `Schema source: ${useS3 ? `S3 (s3://${BUCKET_NAME}/${SCHEMA_DIR}/)` : "local"}`,
  );

  for (const file of FILES) {
    let content;

    if (useS3) {
      console.log(`Downloading: ${file}`);
      content = await downloadFromS3(file);
    } else {
      const srcPath = path.join(LOCAL_DIR, file);
      if (!fs.existsSync(srcPath)) {
        console.error(`Source file not found: ${srcPath}`);
        console.error(
          "Make sure mediajel-gql-service/src/webapp/public-api/ exists.",
        );
        process.exit(1);
      }
      console.log(`Copying local: ${file}`);
      content = fs.readFileSync(srcPath, "utf-8");
    }

    fs.writeFileSync(path.join(DEST_DIR, file), content);
    console.log(`Synced: ${file}`);
  }

  console.log("Schema sync complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
