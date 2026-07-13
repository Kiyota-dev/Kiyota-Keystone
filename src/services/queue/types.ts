export interface Job<T = unknown> {
  id?: string;
  type: string;
  payload: T;
  attempts?: number;
  createdAt?: Date;
}

export type JobHandler = (job: Job) => void | Promise<void>;

export interface QueueStats {
  type: string;
  count: number;
  failed?: number;
  delayed?: number;
}

export interface Queue {
  enqueue<T>(job: Job<T>): Promise<void>;
  process(type: string, handler: JobHandler): void;
  getStats?(): Promise<QueueStats[]>;
  close?(): Promise<void>;
}
