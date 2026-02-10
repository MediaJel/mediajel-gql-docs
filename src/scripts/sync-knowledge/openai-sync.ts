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
      instructions: `You are the MediaJel AI Assistant, helping users with questions about:
- MediaJel products and features
- Technical documentation and APIs
- Company policies and procedures
- Support and troubleshooting

When answering:
1. Search the knowledge base for relevant information
2. Provide accurate, helpful responses based on the content
3. Include links to source Notion pages when available
4. If you cannot find information, say so clearly
5. Be concise but thorough

For API-related questions, you also have access to the GraphQL schema documentation.`,
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
