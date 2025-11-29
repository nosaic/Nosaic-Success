import type { Context, Next } from "hono";

interface RateLimitConfig {
	key: string;
	limit: number;
	windowMs: number;
}

export async function rateLimit(config: RateLimitConfig): Promise<(c: Context, next: Next) => Promise<Response | void>> {
	return async (c: Context, next: Next): Promise<Response | void> => {
		const identifier: string = c.req.header("cf-connecting-ip") || "unknown";
		const key = `ratelimit:${config.key}:${identifier}`;

		const current: any = await c.env.SuccessKV.get(key);
		const count: number = current ? parseInt(current) : 0;

		if (count >= config.limit) {
			return c.json({ error: "Too many requests" }, 429);
		}

		await c.env.SuccessKV.put(key, (count + 1).toString(), {
			expirationTtl: Math.floor(config.windowMs / 1000),
		});

		await next();
	};
}
