import type { Context, Next } from "hono";
import { verifyToken, type JWTPayload } from "@nosaic/core";

/**
 * Authentication middleware - requires valid JWT
 */
export async function requireAuth(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next): Promise<Response | void> {
	const authHeader: string | undefined = c.req.header("Authorization");

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const token: string = authHeader.substring(7);
	const payload: JWTPayload | null = await verifyToken(token, c.env.JWT_SECRET);

	if (!payload) {
		return c.json({ error: "Invalid or expired token" }, 401);
	}

	// Attach user info to context
	c.set("userId", payload.userId);
	c.set("userEmail", payload.email);

	await next();
}
