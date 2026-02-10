import OpenAI from "openai";
import type { ExtractedDocument } from "./content-extractor.js";
import fs from "fs";
import path from "path";
import os from "os";

export interface SyncResult {
  assistantId: string;
  vectorStoreId: string;
  filesUploaded: number;
  totalCharacters: number;
}

export class OpenAISync {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async getOrCreateVectorStore(existingId?: string): Promise<string> {
    if (existingId) {
      try {
        const store = await this.client.vectorStores.retrieve(existingId);
        console.log(`Using existing vector store: ${store.id}`);
        return store.id;
      } catch {
        console.log(`Vector store ${existingId} not found, creating new one...`);
      }
    }

    const store = await this.client.vectorStores.create({
      name: "MediaJel Knowledge Base",
      expires_after: {
        anchor: "last_active_at",
        days: 30,
      },
    });

    console.log(`Created new vector store: ${store.id}`);
    return store.id;
  }

  async getOrCreateAssistant(
    existingId?: string,
    vectorStoreId?: string
  ): Promise<string> {
    if (existingId) {
      try {
        const assistant = await this.client.beta.assistants.retrieve(existingId);
        console.log(`Using existing assistant: ${assistant.id}`);

        // Update assistant with vector store if provided
        if (vectorStoreId) {
          await this.client.beta.assistants.update(existingId, {
            tool_resources: {
              file_search: {
                vector_store_ids: [vectorStoreId],
              },
            },
          });
        }

        return assistant.id;
      } catch {
        console.log(`Assistant ${existingId} not found, creating new one...`);
      }
    }

    const assistant = await this.client.beta.assistants.create({
      name: "MediaJel AI Assistant",
      instructions: `You are the MediaJel AI Assistant, a specialized hybrid AI that helps users with:
- MediaJel products, features, and company information
- Technical documentation and GraphQL API queries
- Business-to-technical translation (e.g., "weekly performance report" → pacingDataObjectsConnection)
- Support and troubleshooting

## Hybrid Architecture Understanding

You operate with a hybrid context system:
1. **Knowledge Base (RAG)**: Company info, product features, compliance, case studies
2. **Schema Context**: GraphQL operations, types, and query examples (provided dynamically)
3. **Domain Glossary**: Business term mappings to technical API operations

## How to Respond

### For Business/Performance Questions
When users ask about "weekly reports", "ROAS", "campaign performance", etc.:
1. Recognize these as business terms that map to specific API operations
2. Look at the additional_instructions for relevant operations and examples
3. Provide a working GraphQL query that answers their business question
4. Explain what the query does in business terms

### For Direct API Questions
When users ask "How do I query campaigns?" or "What fields are on PacingDataObject?":
1. Provide accurate GraphQL query/mutation syntax
2. Include proper variable definitions
3. Show example variables when helpful
4. Reference the schema context provided

### For Company/Product Questions
When users ask "What is DemoGraph?" or "Tell me about MediaJel":
1. Search the knowledge base using file_search
2. Provide information from the company documentation
3. Cite sources when available

## Key Business Term Mappings

- "Weekly performance report" → pacingDataObjectsConnection with date filtering
- "ROAS / Return on ad spend" → pacingDataObjectsConnection (revenue/spend fields)
- "Campaign orders" → campaignOrdersConnection
- "List campaigns" → campaignsConnection
- "Attribution data" → attributionEventsConnection
- "Creatives / Ad assets" → creativesConnection
- "Organizations / Clients" → orgsConnection

## Response Guidelines

1. Always format code with proper markdown code blocks (\`\`\`graphql, \`\`\`json)
2. Be concise but thorough
3. If you cannot find information, say so clearly
4. When showing queries, include example variables when relevant
5. Explain the connection between business terms and technical operations`,
      model: "gpt-4o",
      tools: [{ type: "file_search" }],
      tool_resources: vectorStoreId
        ? {
            file_search: {
              vector_store_ids: [vectorStoreId],
            },
          }
        : undefined,
    });

    console.log(`Created new assistant: ${assistant.id}`);
    return assistant.id;
  }

  async clearVectorStore(vectorStoreId: string): Promise<void> {
    console.log("Clearing existing files from vector store...");

    const files = await this.client.vectorStores.files.list(vectorStoreId);

    for (const file of files.data) {
      try {
        await this.client.vectorStores.files.del(vectorStoreId, file.id);
        await this.client.files.del(file.id);
      } catch (error) {
        console.warn(`Failed to delete file ${file.id}:`, error);
      }
    }

    console.log(`Cleared ${files.data.length} files from vector store`);
  }

  async uploadDocuments(
    documents: ExtractedDocument[],
    vectorStoreId: string
  ): Promise<number> {
    console.log(`Uploading ${documents.length} documents to vector store...`);

    // Create temp directory for files
    const tempDir = path.join(os.tmpdir(), "knowledge-sync-" + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      const filePaths: string[] = [];

      // Write documents to temp files
      for (const doc of documents) {
        const safeTitle = doc.title
          .replace(/[^a-zA-Z0-9-_]/g, "_")
          .substring(0, 50);
        const filename = `${safeTitle}-${doc.id.substring(0, 8)}.md`;
        const filepath = path.join(tempDir, filename);

        fs.writeFileSync(filepath, doc.content);
        filePaths.push(filepath);
      }

      // Upload files in batches
      const batchSize = 20;
      let uploadedCount = 0;

      for (let i = 0; i < filePaths.length; i += batchSize) {
        const batch = filePaths.slice(i, i + batchSize);
        const fileStreams = batch.map((fp) => fs.createReadStream(fp));

        await this.client.vectorStores.fileBatches.uploadAndPoll(
          vectorStoreId,
          { files: fileStreams }
        );

        uploadedCount += batch.length;
        console.log(`  Uploaded ${uploadedCount}/${filePaths.length} files`);
      }

      return uploadedCount;
    } finally {
      // Cleanup temp directory
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  async sync(
    documents: ExtractedDocument[],
    options: {
      assistantId?: string;
      vectorStoreId?: string;
      clearExisting?: boolean;
    } = {}
  ): Promise<SyncResult> {
    // Get or create vector store
    const vectorStoreId = await this.getOrCreateVectorStore(options.vectorStoreId);

    // Clear existing files if requested
    if (options.clearExisting !== false) {
      await this.clearVectorStore(vectorStoreId);
    }

    // Upload documents
    const filesUploaded = await this.uploadDocuments(documents, vectorStoreId);

    // Get or create assistant
    const assistantId = await this.getOrCreateAssistant(
      options.assistantId,
      vectorStoreId
    );

    const totalCharacters = documents.reduce(
      (sum, doc) => sum + doc.content.length,
      0
    );

    return {
      assistantId,
      vectorStoreId,
      filesUploaded,
      totalCharacters,
    };
  }
}
