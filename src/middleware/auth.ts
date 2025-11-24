import type { Context, Next } from "hono";
import { verifyToken } from "../utils/jwt";

/**
 * Authentication middleware - requires valid JWT
 */
export async function requireAuth(c: Context, next: Next) {
	const authHeader = c.req.header("Authorization");

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const token = authHeader.substring(7);
	const payload = await verifyToken(token, c.env.JWT_SECRET);

	if (!payload) {
		return c.json({ error: "Invalid or expired token" }, 401);
	}

	// Attach user info to context
	c.set("userId", payload.userId);
	c.set("userEmail", payload.email);

	await next();
}
