export interface Job<T = unknown> {
  id?: string;
  type: string;
  payload: T;
  attempts?: number;
  createdAt?: Date;
}

export type JobHandler = (job: Job) => void | Promise<void>;

export interface Queue {
  enqueue<T>(job: Job<T>): Promise<void>;
  process(type: string, handler: JobHandler): void;
  close?(): Promise<void>;
}
