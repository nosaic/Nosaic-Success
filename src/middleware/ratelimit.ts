import type { Context, Next } from "hono";

interface RateLimitConfig {
	key: string;
	limit: number;
	windowMs: number;
}

export async function rateLimit(config: RateLimitConfig) {
	return async (c: Context, next: Next) => {
		const identifier = c.req.header("cf-connecting-ip") || "unknown";
		const key = `ratelimit:${config.key}:${identifier}`;

		const current = await c.env.KV.get(key);
		const count = current ? parseInt(current) : 0;

		if (count >= config.limit) {
			return c.json({ error: "Too many requests" }, 429);
		}

		await c.env.KV.put(key, (count + 1).toString(), {
			expirationTtl: Math.floor(config.windowMs / 1000),
		});

		await next();
	};
}
