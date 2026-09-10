/**
 * Best-effort per-IP throttle for the public endpoints that cost money (the
 * CV scan calls a paid model) or storage.
 *
 * It lives in the function instance's memory, so it resets on a cold start
 * and is not shared between instances. That is enough to stop a script
 * hammering one endpoint; it is not a quota.
 */

const hits = new Map<string, number[]>();

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function rateLimited(request: Request, name: string, limit: number, windowMs: number) {
  const now = Date.now();
  const key = `${name}:${clientIp(request)}`;
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  const limited = recent.length >= limit;
  if (!limited) recent.push(now);
  hits.set(key, recent);

  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (!times.some((t) => now - t < windowMs)) hits.delete(k);
    }
  }
  return limited;
}
