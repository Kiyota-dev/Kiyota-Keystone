import type { Queue, Job, JobHandler } from "./types.js";

export class InProcessQueue implements Queue {
  private handlers = new Map<string, JobHandler>();

  async enqueue<T>(job: Job<T>): Promise<void> {
    setImmediate(() => {
      this.run(job).catch((err) => {
        console.error(`[in-process-queue] job ${job.type} failed:`, err);
      });
    });
  }

  process(type: string, handler: JobHandler): void {
    this.handlers.set(type, handler);
  }

  async close(): Promise<void> {
    this.handlers.clear();
  }

  private async run(job: Job): Promise<void> {
    const handler = this.handlers.get(job.type);
    if (!handler) {
      console.warn(`[in-process-queue] no handler registered for ${job.type}`);
      return;
    }
    await handler(job);
  }
}
