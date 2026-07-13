import { redis } from "./redis.js";

const ANOMALY_WINDOW_SECONDS = 300;
const FAILED_LOGIN_THRESHOLD = 10;
const NEW_DEVICE_THRESHOLD = 3;

export async function recordFailedLogin(identifier: string): Promise<number> {
  if (redis.status !== "ready" && redis.status !== "connect") return 0;
  const key = `anomaly:failed_login:${identifier}`;
  const now = Date.now();
  const windowStart = now - ANOMALY_WINDOW_SECONDS * 1000;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);
  pipeline.zadd(key, now, `${now}:${Math.random().toString(36).slice(2)}`);
  pipeline.zcard(key);
  pipeline.pexpire(key, ANOMALY_WINDOW_SECONDS * 1000);
  const results = await pipeline.exec();
  return (results?.[2]?.[1] as number) ?? 0;
}

export async function isFailedLoginAnomaly(identifier: string): Promise<boolean> {
  const count = await recordFailedLogin(identifier);
  return count >= FAILED_LOGIN_THRESHOLD;
}

export async function recordNewDevice(userId: string): Promise<number> {
  if (redis.status !== "ready" && redis.status !== "connect") return 0;
  const key = `anomaly:new_device:${userId}`;
  const now = Date.now();
  const windowStart = now - ANOMALY_WINDOW_SECONDS * 1000;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);
  pipeline.zadd(key, now, `${now}:${Math.random().toString(36).slice(2)}`);
  pipeline.zcard(key);
  pipeline.pexpire(key, ANOMALY_WINDOW_SECONDS * 1000);
  const results = await pipeline.exec();
  return (results?.[2]?.[1] as number) ?? 0;
}

export async function isNewDeviceAnomaly(userId: string): Promise<boolean> {
  const count = await recordNewDevice(userId);
  return count >= NEW_DEVICE_THRESHOLD;
}
