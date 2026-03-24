/**
 * ConversionQueue.ts
 *
 * In-memory job queue for IFC → XKT/glTF conversion.
 * Manages job lifecycle (pending → running → completed/failed),
 * concurrency limiting, progress reporting, and retry logic.
 *
 * Production use would swap the in-memory queue for Redis/BullMQ.
 *
 * Phase 6, Task 6.6
 */

// ── Types ──────────────────────────────────────────────────

export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface ConversionJob {
  id: string;
  /** Original uploaded file path */
  inputPath: string;
  /** Desired output path */
  outputPath: string;
  /** Current status */
  status: JobStatus;
  /** Progress 0–100 */
  progress: number;
  /** Error message if failed */
  error?: string;
  /** ISO timestamp when created */
  createdAt: string;
  /** ISO timestamp when started */
  startedAt?: string;
  /** ISO timestamp when finished */
  completedAt?: string;
  /** Number of retry attempts */
  retryCount: number;
  /** Max retries before giving up */
  maxRetries: number;
}

export interface QueueOptions {
  /** Maximum concurrent conversions (default: 2) */
  concurrency: number;
  /** Default max retries per job (default: 3) */
  maxRetries: number;
  /** Job timeout in ms (default: 300 000 = 5 min) */
  jobTimeout: number;
}

/** Worker function that performs the actual conversion */
export type ConversionWorker = (
  job: ConversionJob,
  reportProgress: (pct: number) => void,
) => Promise<void>;

// ── Constants ──────────────────────────────────────────────

const DEFAULT_CONCURRENCY = 2;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_JOB_TIMEOUT = 5 * 60 * 1000; // 5 min

// ── Class ──────────────────────────────────────────────────

export class ConversionQueue {
  private _options: QueueOptions;
  private _jobs: Map<string, ConversionJob> = new Map();
  private _pending: string[] = [];
  private _activeCount = 0;
  private _worker: ConversionWorker | null = null;
  private _listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private _jobCounter = 0;
  private _paused = false;

  constructor(options?: Partial<QueueOptions>) {
    this._options = {
      concurrency: options?.concurrency ?? DEFAULT_CONCURRENCY,
      maxRetries: options?.maxRetries ?? DEFAULT_MAX_RETRIES,
      jobTimeout: options?.jobTimeout ?? DEFAULT_JOB_TIMEOUT,
    };
  }

  // ── Public API ────────────────────────────────────────

  get size(): number {
    return this._jobs.size;
  }

  get pendingCount(): number {
    return this._pending.length;
  }

  get activeCount(): number {
    return this._activeCount;
  }

  get isPaused(): boolean {
    return this._paused;
  }

  /**
   * Set the worker function that performs conversion.
   */
  setWorker(worker: ConversionWorker): void {
    this._worker = worker;
  }

  /**
   * Enqueue a new conversion job. Returns the job ID.
   */
  enqueue(inputPath: string, outputPath: string): string {
    this._jobCounter++;
    const id = `job-${this._jobCounter}-${Date.now()}`;
    const job: ConversionJob = {
      id,
      inputPath,
      outputPath,
      status: "pending",
      progress: 0,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: this._options.maxRetries,
    };
    this._jobs.set(id, job);
    this._pending.push(id);
    this._emit("job-added", job);
    this._processNext();
    return id;
  }

  /**
   * Get a job by ID.
   */
  getJob(id: string): ConversionJob | undefined {
    return this._jobs.get(id);
  }

  /**
   * Get all jobs.
   */
  getAllJobs(): ConversionJob[] {
    return Array.from(this._jobs.values());
  }

  /**
   * Cancel a pending or running job.
   */
  cancel(id: string): boolean {
    const job = this._jobs.get(id);
    if (!job) return false;
    if (job.status === "completed" || job.status === "cancelled") return false;

    job.status = "cancelled";
    job.completedAt = new Date().toISOString();

    // Remove from pending queue if still there
    const idx = this._pending.indexOf(id);
    if (idx >= 0) this._pending.splice(idx, 1);

    this._emit("job-cancelled", job);
    return true;
  }

  /**
   * Pause the queue (no new jobs will start).
   */
  pause(): void {
    this._paused = true;
    this._emit("paused");
  }

  /**
   * Resume the queue.
   */
  resume(): void {
    this._paused = false;
    this._emit("resumed");
    this._processNext();
  }

  /**
   * Clear all completed/failed/cancelled jobs from the queue.
   */
  prune(): number {
    let removed = 0;
    for (const [id, job] of this._jobs) {
      if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
        this._jobs.delete(id);
        removed++;
      }
    }
    return removed;
  }

  /**
   * Destroy the queue, cancelling all pending jobs.
   */
  destroy(): void {
    for (const id of this._pending) {
      const job = this._jobs.get(id);
      if (job) {
        job.status = "cancelled";
        job.completedAt = new Date().toISOString();
      }
    }
    this._pending = [];
    this._listeners.clear();
  }

  // ── Events ────────────────────────────────────────────

  on(event: string, callback: (...args: unknown[]) => void): () => void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(callback);
    return () => this._listeners.get(event)?.delete(callback);
  }

  // ── Private ───────────────────────────────────────────

  private _emit(event: string, ...args: unknown[]): void {
    const listeners = this._listeners.get(event);
    if (listeners) {
      for (const fn of listeners) {
        fn(...args);
      }
    }
  }

  private _processNext(): void {
    if (this._paused) return;
    if (!this._worker) return;

    while (this._activeCount < this._options.concurrency && this._pending.length > 0) {
      const id = this._pending.shift()!;
      const job = this._jobs.get(id);
      if (!job || job.status === "cancelled") continue;

      this._activeCount++;
      job.status = "running";
      job.startedAt = new Date().toISOString();
      this._emit("job-started", job);
      this._runJob(job);
    }
  }

  private async _runJob(job: ConversionJob): Promise<void> {
    if (!this._worker) return;

    const reportProgress = (pct: number) => {
      job.progress = Math.max(0, Math.min(100, pct));
      this._emit("job-progress", job, job.progress);
    };

    // Set up timeout
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
    }, this._options.jobTimeout);

    try {
      await this._worker(job, reportProgress);
      clearTimeout(timer);

      if (timedOut) {
        throw new Error("Job timed out");
      }

      job.status = "completed";
      job.progress = 100;
      job.completedAt = new Date().toISOString();
      this._emit("job-completed", job);
    } catch (err: unknown) {
      clearTimeout(timer);
      const msg = err instanceof Error ? err.message : String(err);
      job.error = msg;

      if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        job.status = "pending";
        job.progress = 0;
        job.error = undefined;
        this._pending.push(job.id);
        this._emit("job-retry", job, job.retryCount);
      } else {
        job.status = "failed";
        job.completedAt = new Date().toISOString();
        this._emit("job-failed", job, msg);
      }
    } finally {
      this._activeCount--;
      this._processNext();
    }
  }
}
