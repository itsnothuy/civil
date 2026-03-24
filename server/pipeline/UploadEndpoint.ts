/**
 * UploadEndpoint.ts
 *
 * Server-side IFC upload endpoint logic (framework-agnostic).
 * Validates file type, enforces size limits, and queues conversion jobs.
 *
 * This module provides portable handler functions that can be mounted
 * on Express, Koa, Fastify, or similar HTTP frameworks.
 *
 * Phase 6, Task 6.6
 */

// ── Types ──────────────────────────────────────────────────

export interface UploadConfig {
  /** Maximum file size in bytes (default: 200 MB) */
  maxFileSize: number;
  /** Allowed MIME types (default: IFC-related types) */
  allowedMimeTypes: string[];
  /** Upload destination directory (default: "uploads/") */
  uploadDir: string;
  /** Allowed file extensions (default: [".ifc"]) */
  allowedExtensions: string[];
  /** Allowed CORS origins (default: ["*"]) */
  corsOrigins: string[];
}

export interface UploadResult {
  success: boolean;
  jobId?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
  code?: "FILE_TOO_LARGE" | "INVALID_TYPE" | "INVALID_EXTENSION" | "NO_FILE" | "VALIDATION_FAILED";
}

export interface UploadRequest {
  /** Original file name from the client */
  fileName: string;
  /** MIME type as reported by the client */
  mimeType: string;
  /** File size in bytes */
  fileSize: number;
  /** File content as a Buffer or Uint8Array */
  content: Uint8Array;
}

// ── Constants ──────────────────────────────────────────────

const DEFAULT_MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB
const DEFAULT_ALLOWED_MIME_TYPES = ["application/x-step", "application/octet-stream", "model/ifc"];
const DEFAULT_ALLOWED_EXTENSIONS = [".ifc"];
const IFC_MAGIC_HEADER = "ISO-10303-21";

// ── Default config ─────────────────────────────────────────

export function createDefaultConfig(overrides?: Partial<UploadConfig>): UploadConfig {
  return {
    maxFileSize: overrides?.maxFileSize ?? DEFAULT_MAX_FILE_SIZE,
    allowedMimeTypes: overrides?.allowedMimeTypes ?? [...DEFAULT_ALLOWED_MIME_TYPES],
    uploadDir: overrides?.uploadDir ?? "uploads/",
    allowedExtensions: overrides?.allowedExtensions ?? [...DEFAULT_ALLOWED_EXTENSIONS],
    corsOrigins: overrides?.corsOrigins ?? ["*"],
  };
}

// ── Validation ─────────────────────────────────────────────

/**
 * Validate that the file extension is permitted.
 */
export function validateExtension(fileName: string, config: UploadConfig): boolean {
  const ext =
    fileName.lastIndexOf(".") >= 0 ? fileName.slice(fileName.lastIndexOf(".")).toLowerCase() : "";
  return config.allowedExtensions.includes(ext);
}

/**
 * Validate MIME type against the allow-list.
 */
export function validateMimeType(mimeType: string, config: UploadConfig): boolean {
  return config.allowedMimeTypes.includes(mimeType.toLowerCase());
}

/**
 * Content-based validation: check the IFC magic header bytes.
 * IFC STEP files start with "ISO-10303-21".
 */
export function validateContent(content: Uint8Array): boolean {
  if (content.length < IFC_MAGIC_HEADER.length) return false;
  const header = new TextDecoder().decode(content.slice(0, IFC_MAGIC_HEADER.length));
  return header === IFC_MAGIC_HEADER;
}

/**
 * Full validation pipeline for an uploaded file.
 */
export function validateUpload(req: UploadRequest, config: UploadConfig): UploadResult {
  if (!req.fileName || req.fileSize === 0) {
    return { success: false, error: "No file provided", code: "NO_FILE" };
  }

  if (req.fileSize > config.maxFileSize) {
    return {
      success: false,
      error: `File size ${req.fileSize} exceeds limit ${config.maxFileSize}`,
      code: "FILE_TOO_LARGE",
    };
  }

  if (!validateExtension(req.fileName, config)) {
    return {
      success: false,
      error: `Extension not allowed for "${req.fileName}"`,
      code: "INVALID_EXTENSION",
    };
  }

  if (!validateMimeType(req.mimeType, config)) {
    return {
      success: false,
      error: `MIME type "${req.mimeType}" not allowed`,
      code: "INVALID_TYPE",
    };
  }

  if (!validateContent(req.content)) {
    return {
      success: false,
      error: "File content does not match IFC format",
      code: "VALIDATION_FAILED",
    };
  }

  return { success: true, fileName: req.fileName, fileSize: req.fileSize };
}
