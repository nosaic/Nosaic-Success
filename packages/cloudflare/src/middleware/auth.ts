import type { Context, Next } from "hono";
import { verifyToken } from "@clerk/clerk-sdk-node";

/**
 * Authentication middleware - requires valid Clerk JWT
 */
export async function requireAuth(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next): Promise<Response | void> {
	const authHeader: string | undefined = c.req.header("Authorization");

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const token: string = authHeader.substring(7);

	try {
		// Verify the JWT token with Clerk
		const payload = await verifyToken(token, {
			secretKey: c.env.CLERK_SECRET_KEY,
			issuer: "https://clerk.clerk.com", // Default Clerk issuer
		});

		if (!payload) {
			return c.json({ error: "Invalid token" }, 401);
		}

		// Attach user info to context
		c.set("userId", payload.sub as string);
		c.set("userEmail", payload.email as string);

		await next();
	} catch (error) {
		return c.json({ error: "Invalid or expired token" }, 401);
	}
}
