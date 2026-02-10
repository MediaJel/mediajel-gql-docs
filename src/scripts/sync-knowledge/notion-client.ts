import { Client } from "@notionhq/client";
import type {
  PageObjectResponse,
  BlockObjectResponse,
} from "@notionhq/client/build/src/api-endpoints.js";

export interface NotionPage {
  id: string;
  title: string;
  url: string;
  parentPath: string[];
  lastEditedTime: string;
  blocks: BlockObjectResponse[];
}

export class NotionClient {
  private client: Client;
  private rateLimitDelay = 350; // ~3 requests per second

  constructor(apiKey: string) {
    this.client = new Client({ auth: apiKey });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    const result = await fn();
    await this.delay(this.rateLimitDelay);
    return result;
  }

  private getPageTitle(page: PageObjectResponse): string {
    const titleProperty = Object.values(page.properties).find(
      (prop) => prop.type === "title"
    );
    if (titleProperty?.type === "title" && titleProperty.title.length > 0) {
      return titleProperty.title.map((t) => t.plain_text).join("");
    }
    return "Untitled";
  }

  async getPage(pageId: string): Promise<PageObjectResponse> {
    return this.withRateLimit(async () => {
      const response = await this.client.pages.retrieve({ page_id: pageId });
      return response as PageObjectResponse;
    });
  }

  async getBlockChildren(blockId: string): Promise<BlockObjectResponse[]> {
    const blocks: BlockObjectResponse[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.withRateLimit(async () =>
        this.client.blocks.children.list({
          block_id: blockId,
          start_cursor: cursor,
          page_size: 100,
        })
      );

      for (const block of response.results) {
        if ("type" in block) {
          blocks.push(block as BlockObjectResponse);

          // Recursively fetch children for blocks that have them
          if (block.has_children) {
            const children = await this.getBlockChildren(block.id);
            // Attach children to parent block for processing
            (block as BlockObjectResponse & { children?: BlockObjectResponse[] }).children = children;
          }
        }
      }

      cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
    } while (cursor);

    return blocks;
  }

  async getChildPages(pageId: string): Promise<string[]> {
    const childPageIds: string[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.withRateLimit(async () =>
        this.client.blocks.children.list({
          block_id: pageId,
          start_cursor: cursor,
          page_size: 100,
        })
      );

      for (const block of response.results) {
        if ("type" in block && block.type === "child_page") {
          childPageIds.push(block.id);
        }
        // Also check for linked databases that might contain pages
        if ("type" in block && block.type === "child_database") {
          const dbPages = await this.getDatabasePages(block.id);
          childPageIds.push(...dbPages);
        }
      }

      cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
    } while (cursor);

    return childPageIds;
  }

  async getDatabasePages(databaseId: string): Promise<string[]> {
    const pageIds: string[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.withRateLimit(async () =>
        this.client.databases.query({
          database_id: databaseId,
          start_cursor: cursor,
          page_size: 100,
        })
      );

      for (const page of response.results) {
        if ("id" in page) {
          pageIds.push(page.id);
        }
      }

      cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
    } while (cursor);

    return pageIds;
  }

  async fetchAllPages(
    rootPageId: string,
    parentPath: string[] = []
  ): Promise<NotionPage[]> {
    const pages: NotionPage[] = [];

    try {
      // Get the root page
      const page = await this.getPage(rootPageId);
      const title = this.getPageTitle(page);
      const currentPath = [...parentPath, title];

      // Get page content
      const blocks = await this.getBlockChildren(rootPageId);

      pages.push({
        id: page.id,
        title,
        url: page.url,
        parentPath,
        lastEditedTime: page.last_edited_time,
        blocks,
      });

      console.log(`  Fetched: ${currentPath.join(" > ")}`);

      // Recursively fetch child pages
      const childPageIds = await this.getChildPages(rootPageId);
      for (const childId of childPageIds) {
        const childPages = await this.fetchAllPages(childId, currentPath);
        pages.push(...childPages);
      }
    } catch (error) {
      console.error(`Error fetching page ${rootPageId}:`, error);
    }

    return pages;
  }

  // Convert markdown content to Notion blocks
  private markdownToBlocks(content: string): any[] {
    const blocks: any[] = [];
    const lines = content.split('\n');
    let currentParagraph: string[] = [];

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join('\n').trim();
        if (text) {
          // Split text into chunks of max 2000 characters
          const chunks = this.splitText(text, 2000);
          for (const chunk of chunks) {
            blocks.push({
              object: "block",
              type: "paragraph",
              paragraph: {
                rich_text: [{ type: "text", text: { content: chunk } }],
              },
            });
          }
        }
        currentParagraph = [];
      }
    };

    for (const line of lines) {
      // Heading 1
      if (line.startsWith('# ')) {
        flushParagraph();
        blocks.push({
          object: "block",
          type: "heading_1",
          heading_1: {
            rich_text: [{ type: "text", text: { content: line.slice(2).trim() } }],
          },
        });
      }
      // Heading 2
      else if (line.startsWith('## ')) {
        flushParagraph();
        blocks.push({
          object: "block",
          type: "heading_2",
          heading_2: {
            rich_text: [{ type: "text", text: { content: line.slice(3).trim() } }],
          },
        });
      }
      // Heading 3
      else if (line.startsWith('### ')) {
        flushParagraph();
        blocks.push({
          object: "block",
          type: "heading_3",
          heading_3: {
            rich_text: [{ type: "text", text: { content: line.slice(4).trim() } }],
          },
        });
      }
      // Horizontal rule
      else if (line.trim() === '---') {
        flushParagraph();
        blocks.push({
          object: "block",
          type: "divider",
          divider: {},
        });
      }
      // Bullet list item
      else if (line.match(/^[-*]\s/)) {
        flushParagraph();
        blocks.push({
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [{ type: "text", text: { content: line.slice(2).trim() } }],
          },
        });
      }
      // Numbered list item
      else if (line.match(/^\d+\.\s/)) {
        flushParagraph();
        const content = line.replace(/^\d+\.\s/, '').trim();
        blocks.push({
          object: "block",
          type: "numbered_list_item",
          numbered_list_item: {
            rich_text: [{ type: "text", text: { content } }],
          },
        });
      }
      // Blockquote
      else if (line.startsWith('> ')) {
        flushParagraph();
        blocks.push({
          object: "block",
          type: "quote",
          quote: {
            rich_text: [{ type: "text", text: { content: line.slice(2).trim() } }],
          },
        });
      }
      // Empty line - end paragraph
      else if (line.trim() === '') {
        flushParagraph();
      }
      // Regular text - add to current paragraph
      else {
        currentParagraph.push(line);
      }
    }

    flushParagraph();
    return blocks;
  }

  // Split text into chunks of max length, trying to break at word boundaries
  private splitText(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) {
      return [text];
    }

    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > maxLength) {
      // Try to find a good break point (newline, period, space)
      let breakPoint = remaining.lastIndexOf('\n', maxLength);
      if (breakPoint === -1 || breakPoint < maxLength / 2) {
        breakPoint = remaining.lastIndexOf('. ', maxLength);
        if (breakPoint !== -1) breakPoint += 1; // Include the period
      }
      if (breakPoint === -1 || breakPoint < maxLength / 2) {
        breakPoint = remaining.lastIndexOf(' ', maxLength);
      }
      if (breakPoint === -1 || breakPoint < maxLength / 2) {
        breakPoint = maxLength;
      }

      chunks.push(remaining.slice(0, breakPoint).trim());
      remaining = remaining.slice(breakPoint).trim();
    }

    if (remaining) {
      chunks.push(remaining);
    }

    return chunks;
  }

  // Create a new page under a parent
  async createPage(
    parentId: string,
    title: string,
    icon?: string,
    content?: string
  ): Promise<PageObjectResponse> {
    return this.withRateLimit(async () => {
      const children = content ? this.markdownToBlocks(content) : [];

      const response = await this.client.pages.create({
        parent: { page_id: parentId },
        icon: icon ? { type: "emoji", emoji: icon as any } : undefined,
        properties: {
          title: {
            title: [{ text: { content: title } }],
          },
        },
        children,
      });
      return response as PageObjectResponse;
    });
  }
}
