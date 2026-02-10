import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints.js";
import type { NotionPage } from "./notion-client.js";

type RichTextItem = {
  type: string;
  plain_text: string;
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
  };
  href?: string | null;
};

type BlockWithChildren = BlockObjectResponse & {
  children?: BlockObjectResponse[];
};

export interface ExtractedDocument {
  id: string;
  title: string;
  url: string;
  path: string;
  content: string;
  lastEditedTime: string;
}

export class ContentExtractor {
  extractRichText(richText: RichTextItem[]): string {
    if (!richText || richText.length === 0) return "";

    return richText
      .map((item) => {
        let text = item.plain_text;

        if (item.annotations?.bold) text = `**${text}**`;
        if (item.annotations?.italic) text = `*${text}*`;
        if (item.annotations?.strikethrough) text = `~~${text}~~`;
        if (item.annotations?.code) text = `\`${text}\``;
        if (item.href) text = `[${text}](${item.href})`;

        return text;
      })
      .join("");
  }

  blockToMarkdown(block: BlockWithChildren, indent = 0): string {
    const indentStr = "  ".repeat(indent);
    let result = "";

    switch (block.type) {
      case "paragraph":
        result = this.extractRichText(block.paragraph.rich_text as RichTextItem[]);
        break;

      case "heading_1":
        result = `# ${this.extractRichText(block.heading_1.rich_text as RichTextItem[])}`;
        break;

      case "heading_2":
        result = `## ${this.extractRichText(block.heading_2.rich_text as RichTextItem[])}`;
        break;

      case "heading_3":
        result = `### ${this.extractRichText(block.heading_3.rich_text as RichTextItem[])}`;
        break;

      case "bulleted_list_item":
        result = `${indentStr}- ${this.extractRichText(block.bulleted_list_item.rich_text as RichTextItem[])}`;
        break;

      case "numbered_list_item":
        result = `${indentStr}1. ${this.extractRichText(block.numbered_list_item.rich_text as RichTextItem[])}`;
        break;

      case "to_do":
        const checked = block.to_do.checked ? "x" : " ";
        result = `${indentStr}- [${checked}] ${this.extractRichText(block.to_do.rich_text as RichTextItem[])}`;
        break;

      case "toggle":
        result = `${indentStr}<details>\n${indentStr}<summary>${this.extractRichText(block.toggle.rich_text as RichTextItem[])}</summary>\n`;
        break;

      case "code":
        const lang = block.code.language || "";
        const code = this.extractRichText(block.code.rich_text as RichTextItem[]);
        result = `\`\`\`${lang}\n${code}\n\`\`\``;
        break;

      case "quote":
        result = `> ${this.extractRichText(block.quote.rich_text as RichTextItem[])}`;
        break;

      case "callout":
        const icon = block.callout.icon?.type === "emoji" ? block.callout.icon.emoji + " " : "";
        result = `> ${icon}${this.extractRichText(block.callout.rich_text as RichTextItem[])}`;
        break;

      case "divider":
        result = "---";
        break;

      case "table":
        // Tables are complex - just indicate there's a table
        result = "[Table content]";
        break;

      case "child_page":
        result = `[${block.child_page.title}]`;
        break;

      case "child_database":
        result = `[Database: ${block.child_database.title}]`;
        break;

      case "bookmark":
        const url = block.bookmark.url;
        result = `[Bookmark](${url})`;
        break;

      case "link_preview":
        result = `[Link Preview](${block.link_preview.url})`;
        break;

      case "image":
        const imageUrl = block.image.type === "external"
          ? block.image.external.url
          : block.image.file?.url || "";
        const caption = block.image.caption
          ? this.extractRichText(block.image.caption as RichTextItem[])
          : "Image";
        result = `![${caption}](${imageUrl})`;
        break;

      case "video":
        result = "[Video content]";
        break;

      case "file":
        result = "[File attachment]";
        break;

      case "pdf":
        result = "[PDF document]";
        break;

      case "embed":
        result = `[Embed: ${block.embed.url}]`;
        break;

      case "equation":
        result = `$${block.equation.expression}$`;
        break;

      case "column_list":
      case "column":
        // These are structural - children will be processed
        break;

      case "synced_block":
        // Synced blocks contain children that should be processed
        break;

      case "template":
        // Template blocks contain children
        break;

      case "breadcrumb":
      case "table_of_contents":
        // Navigation elements - skip
        break;

      default:
        // Unknown block type
        break;
    }

    // Process children if any
    if (block.children && block.children.length > 0) {
      const childContent = block.children
        .map((child) => this.blockToMarkdown(child as BlockWithChildren, indent + 1))
        .filter((c) => c.trim())
        .join("\n");

      if (childContent) {
        result += "\n" + childContent;
      }

      // Close toggle
      if (block.type === "toggle") {
        result += `\n${indentStr}</details>`;
      }
    }

    return result;
  }

  pageToDocument(page: NotionPage): ExtractedDocument {
    const path = [...page.parentPath, page.title].join(" > ");

    const contentParts: string[] = [];

    // Add metadata header
    contentParts.push(`# ${page.title}`);
    contentParts.push(`**Path:** ${path}`);
    contentParts.push(`**Source:** ${page.url}`);
    contentParts.push("");

    // Convert blocks to markdown
    for (const block of page.blocks) {
      const markdown = this.blockToMarkdown(block as BlockWithChildren);
      if (markdown.trim()) {
        contentParts.push(markdown);
      }
    }

    return {
      id: page.id,
      title: page.title,
      url: page.url,
      path,
      content: contentParts.join("\n"),
      lastEditedTime: page.lastEditedTime,
    };
  }

  extractAll(pages: NotionPage[]): ExtractedDocument[] {
    return pages.map((page) => this.pageToDocument(page));
  }
}
