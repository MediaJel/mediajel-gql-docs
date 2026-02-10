import dotenv from "dotenv";
import path from "path";

// Load .env.local (Next.js convention) then .env as fallback
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
import { NotionClient } from "./notion-client.js";
import { ContentExtractor } from "./content-extractor.js";
import { OpenAISync } from "./openai-sync.js";

interface Config {
  notionApiKey: string;
  notionRootPageId: string;
  openaiApiKey: string;
  openaiAssistantId?: string;
  openaiVectorStoreId?: string;
  dryRun: boolean;
}

function loadConfig(): Config {
  const notionApiKey = process.env.NOTION_API_KEY || process.env.NOTION_SECRET;
  const notionRootPageId = process.env.NOTION_ROOT_PAGE_ID;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!notionApiKey) {
    throw new Error("NOTION_API_KEY or NOTION_SECRET environment variable is required");
  }
  if (!notionRootPageId) {
    throw new Error("NOTION_ROOT_PAGE_ID environment variable is required");
  }
  if (!openaiApiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }

  const dryRun =
    process.env.DRY_RUN === "true" || process.argv.includes("--dry-run");

  return {
    notionApiKey,
    notionRootPageId,
    openaiApiKey,
    openaiAssistantId: process.env.OPENAI_ASSISTANT_ID,
    openaiVectorStoreId: process.env.OPENAI_VECTOR_STORE_ID,
    dryRun,
  };
}

async function main() {
  console.log("======================================");
  console.log("   MediaJel Knowledge Base Sync      ");
  console.log("======================================");
  console.log();

  const config = loadConfig();

  if (config.dryRun) {
    console.log("DRY RUN MODE - No changes will be made to OpenAI\n");
  }

  // Step 1: Fetch from Notion
  console.log("Step 1: Fetching pages from Notion...");
  console.log(`   Root page ID: ${config.notionRootPageId}\n`);

  const notionClient = new NotionClient(config.notionApiKey);
  const pages = await notionClient.fetchAllPages(config.notionRootPageId);

  console.log(`\nFetched ${pages.length} pages from Notion\n`);

  // Step 2: Extract content
  console.log("Step 2: Extracting content...");

  const extractor = new ContentExtractor();
  const documents = extractor.extractAll(pages);

  const totalChars = documents.reduce((sum, doc) => sum + doc.content.length, 0);
  console.log(`Extracted ${documents.length} documents`);
  console.log(`   Total content: ${(totalChars / 1024).toFixed(1)} KB\n`);

  // Show document summary
  console.log("Documents:");
  for (const doc of documents) {
    console.log(`   - ${doc.path} (${doc.content.length} chars)`);
  }
  console.log();

  if (config.dryRun) {
    console.log("Dry run complete. Would have uploaded:");
    console.log(`   - ${documents.length} documents`);
    console.log(`   - ${(totalChars / 1024).toFixed(1)} KB of content`);
    console.log("\nRun without --dry-run to perform the actual sync.");
    return;
  }

  // Step 3: Sync to OpenAI
  console.log("Step 3: Syncing to OpenAI...");

  const openaiSync = new OpenAISync(config.openaiApiKey);
  const result = await openaiSync.sync(documents, {
    assistantId: config.openaiAssistantId,
    vectorStoreId: config.openaiVectorStoreId,
    clearExisting: true,
  });

  console.log("\n======================================");
  console.log("   Sync Complete!                    ");
  console.log("======================================");
  console.log();
  console.log("Results:");
  console.log(`   Assistant ID:    ${result.assistantId}`);
  console.log(`   Vector Store ID: ${result.vectorStoreId}`);
  console.log(`   Files uploaded:  ${result.filesUploaded}`);
  console.log(`   Total content:   ${(result.totalCharacters / 1024).toFixed(1)} KB`);
  console.log();
  console.log("Save these IDs in your .env file:");
  console.log(`   OPENAI_ASSISTANT_ID=${result.assistantId}`);
  console.log(`   OPENAI_VECTOR_STORE_ID=${result.vectorStoreId}`);
}

main().catch((error) => {
  console.error("\nSync failed:", error);
  process.exit(1);
});
