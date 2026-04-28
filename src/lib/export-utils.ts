/**
 * Export utilities for GraphQL Playground responses
 * Supports JSON, CSV, and Excel formats
 */

export type ExportFormat = "json" | "csv" | "xlsx";

export interface CSVOptions {
  delimiter?: string;
  includeHeaders?: boolean;
}

// Maximum recursion depth to prevent stack overflow
const MAX_FLATTEN_DEPTH = 20;

/**
 * Flatten a nested object into a single-level object with dot-notation keys
 * Includes depth limiting and circular reference detection
 */
function flattenObject(
  obj: unknown,
  prefix = "",
  result: Record<string, unknown> = {},
  seen: WeakSet<object> = new WeakSet(),
  depth = 0
): Record<string, unknown> {
  // Depth limit protection
  if (depth > MAX_FLATTEN_DEPTH) {
    result[prefix] = "[Max depth exceeded]";
    return result;
  }

  if (obj === null || obj === undefined) {
    result[prefix] = "";
    return result;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      result[prefix] = "";
    } else if (typeof obj[0] === "object" && obj[0] !== null) {
      // Array of objects - stringify to avoid deep recursion
      result[prefix] = JSON.stringify(obj);
    } else {
      // Array of primitives
      result[prefix] = obj.join(", ");
    }
    return result;
  }

  if (typeof obj === "object") {
    // Circular reference detection
    if (seen.has(obj as object)) {
      result[prefix] = "[Circular reference]";
      return result;
    }
    seen.add(obj as object);

    const entries = Object.entries(obj as Record<string, unknown>);
    for (const [key, value] of entries) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        flattenObject(value, newKey, result, seen, depth + 1);
      } else {
        flattenObject(value, newKey, result, seen, depth + 1);
      }
    }
    return result;
  }

  result[prefix] = obj;
  return result;
}

/**
 * Extract nodes from a GraphQL connection (edges pattern)
 * Handles: { edges: [{ node: {...} }] }
 */
function extractConnectionNodes(connection: Record<string, unknown>): unknown[] {
  if ("edges" in connection && Array.isArray(connection.edges)) {
    const edges = connection.edges as Array<{ node?: unknown }>;
    return edges
      .filter((edge) => edge && typeof edge === "object" && "node" in edge)
      .map((edge) => edge.node);
  }
  return [];
}

/**
 * Extract the data array from a GraphQL response
 * Handles multiple patterns:
 * - { data: { queryName: [...] } } - direct array
 * - { data: { queryName: { edges: [{ node: {...} }] } } } - connection pattern
 */
export function extractDataArray(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;

    // Check for GraphQL response structure
    if ("data" in obj && typeof obj.data === "object" && obj.data !== null) {
      const dataContent = obj.data as Record<string, unknown>;
      const keys = Object.keys(dataContent);

      for (const key of keys) {
        const value = dataContent[key];

        // Direct array
        if (Array.isArray(value)) {
          return value;
        }

        // Connection pattern (edges with nodes)
        if (typeof value === "object" && value !== null) {
          const connectionObj = value as Record<string, unknown>;
          if ("edges" in connectionObj) {
            const nodes = extractConnectionNodes(connectionObj);
            if (nodes.length > 0) {
              return nodes;
            }
          }
        }
      }

      // If no array or connection found, wrap the data object
      return [dataContent];
    }

    // Check for connection pattern at root level
    if ("edges" in obj) {
      const nodes = extractConnectionNodes(obj);
      if (nodes.length > 0) {
        return nodes;
      }
    }

    // Not a GraphQL response, wrap the object
    return [obj];
  }

  // Primitive value
  return [{ value: data }];
}

/**
 * Flatten a GraphQL response into an array of flat objects suitable for CSV/Excel
 */
export function flattenGraphQLResponse(data: unknown): Record<string, unknown>[] {
  const dataArray = extractDataArray(data);
  return dataArray.map((item) => flattenObject(item));
}

/**
 * Export data as JSON string
 */
export function exportToJSON(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

// Characters that can trigger formula execution in spreadsheet applications
const CSV_FORMULA_CHARS = /^[=+\-@\t\r]/;

/**
 * Escape a value for CSV (handle commas, quotes, newlines, and formula injection)
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const str = typeof value === "object" ? JSON.stringify(value) : String(value);

  // CSV injection protection: prefix dangerous characters with single quote
  // This prevents formula execution in Excel/Google Sheets
  if (CSV_FORMULA_CHARS.test(str)) {
    return `"'${str.replace(/"/g, '""')}"`;
  }

  // If the value contains comma, newline, or quote, wrap in quotes
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Export data as CSV string
 */
export function exportToCSV(
  data: unknown,
  options: CSVOptions = {}
): string {
  const { delimiter = ",", includeHeaders = true } = options;

  const flatData = flattenGraphQLResponse(data);

  if (flatData.length === 0) {
    return "";
  }

  // Get all unique headers
  const headersSet = new Set<string>();
  flatData.forEach((row) => {
    Object.keys(row).forEach((key) => headersSet.add(key));
  });
  const headers = Array.from(headersSet);

  const lines: string[] = [];

  // Add header row
  if (includeHeaders) {
    lines.push(headers.map(escapeCSVValue).join(delimiter));
  }

  // Add data rows
  for (const row of flatData) {
    const values = headers.map((header) => escapeCSVValue(row[header]));
    lines.push(values.join(delimiter));
  }

  return lines.join("\n");
}

// Excel has a maximum cell character limit of 32,767
const EXCEL_MAX_CELL_LENGTH = 32767;

/**
 * Truncate a value to fit Excel's cell character limit
 */
function truncateForExcel(value: unknown): unknown {
  if (typeof value === "string" && value.length > EXCEL_MAX_CELL_LENGTH) {
    return value.substring(0, EXCEL_MAX_CELL_LENGTH - 3) + "...";
  }
  return value;
}

/**
 * Export data as Excel workbook (returns Blob)
 * Uses dynamic import to avoid SSR issues with xlsx
 */
export async function exportToExcel(data: unknown): Promise<Blob> {
  // Dynamic import to avoid Next.js SSR issues
  const XLSX = await import("xlsx");

  const flatData = flattenGraphQLResponse(data);

  // Truncate long values to fit Excel's cell character limit
  const truncatedData = flatData.map((row) => {
    const truncatedRow: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      truncatedRow[key] = truncateForExcel(value);
    }
    return truncatedRow;
  });

  // Create worksheet from flat data
  const worksheet = XLSX.utils.json_to_sheet(truncatedData);

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

  // Generate buffer and create blob
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * Generate a filename with timestamp
 */
export function generateFilename(
  queryName: string | undefined,
  format: ExportFormat
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const name = queryName || "response";

  const extensions: Record<ExportFormat, string> = {
    json: "json",
    csv: "csv",
    xlsx: "xlsx",
  };

  return `${name}_${timestamp}.${extensions[format]}`;
}

/**
 * Download content as a file
 * Uses delayed URL revocation to ensure download completes
 */
export function downloadFile(
  content: string | Blob,
  filename: string,
  mimeType?: string
): void {
  let blob: Blob;

  if (content instanceof Blob) {
    blob = content;
  } else {
    blob = new Blob([content], { type: mimeType || "text/plain" });
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Delay URL revocation to ensure download has started
  // Some browsers need time to initiate the download before the URL is revoked
  setTimeout(() => URL.revokeObjectURL(url), 150);
}

/**
 * Extract query name from GraphQL query string
 */
export function extractQueryName(queryString: string): string | undefined {
  // Match named queries/mutations: query QueryName { ... } or mutation MutationName { ... }
  const match = queryString.match(/(?:query|mutation|subscription)\s+(\w+)/i);
  return match?.[1];
}

/**
 * MIME types for export formats
 */
export const MIME_TYPES: Record<ExportFormat, string> = {
  json: "application/json",
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/**
 * Main export function that handles all formats
 */
export async function exportData(
  data: unknown,
  format: ExportFormat,
  queryName?: string
): Promise<void> {
  const filename = generateFilename(queryName, format);

  switch (format) {
    case "json": {
      const jsonContent = exportToJSON(data);
      downloadFile(jsonContent, filename, MIME_TYPES.json);
      break;
    }
    case "csv": {
      const csvContent = exportToCSV(data);
      downloadFile(csvContent, filename, MIME_TYPES.csv);
      break;
    }
    case "xlsx": {
      const excelBlob = await exportToExcel(data);
      downloadFile(excelBlob, filename);
      break;
    }
  }
}
