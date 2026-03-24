/**
 * ModelStorage.ts
 *
 * Abstraction for storing converted model files.
 * Supports local filesystem and provides an interface
 * for S3/CDN backends.
 *
 * Phase 6, Task 6.6
 */

// ── Types ──────────────────────────────────────────────────

export interface StorageBackend {
  /** Store a file and return the public URL / path */
  store(key: string, data: Uint8Array, contentType: string): Promise<string>;
  /** Retrieve a file by key */
  retrieve(key: string): Promise<Uint8Array | null>;
  /** Delete a file by key */
  delete(key: string): Promise<boolean>;
  /** Check if a file exists */
  exists(key: string): Promise<boolean>;
  /** List files matching a prefix */
  list(prefix: string): Promise<string[]>;
}

export interface StoredModel {
  key: string;
  url: string;
  size: number;
  contentType: string;
  createdAt: string;
}

// ── In-Memory Storage (for testing / dev) ──────────────────

export class InMemoryStorage implements StorageBackend {
  private _files: Map<string, { data: Uint8Array; contentType: string }> = new Map();
  private _baseUrl: string;

  constructor(baseUrl = "/models") {
    this._baseUrl = baseUrl;
  }

  async store(key: string, data: Uint8Array, contentType: string): Promise<string> {
    this._files.set(key, { data, contentType });
    return `${this._baseUrl}/${key}`;
  }

  async retrieve(key: string): Promise<Uint8Array | null> {
    const entry = this._files.get(key);
    return entry ? entry.data : null;
  }

  async delete(key: string): Promise<boolean> {
    return this._files.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this._files.has(key);
  }

  async list(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    for (const key of this._files.keys()) {
      if (key.startsWith(prefix)) keys.push(key);
    }
    return keys;
  }

  /** Get the number of stored files (test helper) */
  get fileCount(): number {
    return this._files.size;
  }

  /** Clear all files (test helper) */
  clear(): void {
    this._files.clear();
  }
}

// ── CDN Configuration ──────────────────────────────────────

export interface CDNConfig {
  /** CDN base URL for model delivery */
  baseUrl: string;
  /** Cache-Control header value */
  cacheControl: string;
  /** Whether to use content hashing for cache busting */
  useContentHash: boolean;
}

export function createDefaultCDNConfig(overrides?: Partial<CDNConfig>): CDNConfig {
  return {
    baseUrl: overrides?.baseUrl ?? "/cdn/models",
    cacheControl: overrides?.cacheControl ?? "public, max-age=31536000",
    useContentHash: overrides?.useContentHash ?? true,
  };
}

/**
 * Build a CDN URL for a stored model.
 */
export function buildCDNUrl(cdn: CDNConfig, modelKey: string, hash?: string): string {
  const base = cdn.baseUrl.replace(/\/+$/, "");
  if (cdn.useContentHash && hash) {
    return `${base}/${modelKey}?h=${hash}`;
  }
  return `${base}/${modelKey}`;
}
