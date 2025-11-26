// 'POST /auth/register', '/auth/login', etc.

import { Hono } from "hono";
import {
	hashPassword,
	verifyPassword,
	generateId,
	generateToken,
	signAccessToken,
} from "@nosaic/core";

const auth = new Hono<{ Bindings: Env }>();

/**
 * POST /auth/register
 */
auth.post("/register", async (c): Promise<Response> => {
	const { email, password } = await c.req.json();

	// Validate input
	if (!email || !password) {
		return c.json({ error: "Email and password required" }, 400);
	}

	if (password.length < 8) {
		return c.json({ error: "Password must be at least 8 characters" }, 400);
	}

	// Check if user exists
	const existing: Record<string, unknown> | null = await c.env.DB.prepare(
		"SELECT id FROM users WHERE email = ?",
	)
		.bind(email)
		.first();

	if (existing) {
		return c.json({ error: "Email already registered" }, 409);
	}

	// Create user
	const userId: string = generateId("usr");
	const passwordHash: string = await hashPassword(password);
	const verificationToken: string = generateToken();

	await c.env.DB.prepare(
		`INSERT INTO users (id, email, password_hash, verification_token, email_verified, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
	)
		.bind(
			userId,
			email.toLowerCase(),
			passwordHash,
			verificationToken,
			0,
			Date.now(),
			Date.now(),
		)
		.run();

	// TODO: Send verification email

	return c.json(
		{
			message:
				"Registration successful. Please check your email to verify your account.",
			userId,
		},
		201,
	);
});

/**
 * POST /auth/login
 */
auth.post("/login", async (c) => {
	const { email, password } = await c.req.json();

	if (!email || !password) {
		return c.json({ error: "Email and password required" }, 400);
	}

	// Get user
	const user = (await c.env.DB.prepare(
		"SELECT id, email, password_hash, email_verified FROM users WHERE email = ?",
	)
		.bind(email.toLowerCase())
		.first()) as any;

	if (!user) {
		return c.json({ error: "Invalid credentials" }, 401);
	}

	// Verify password
	const valid: boolean = await verifyPassword(password, user.password_hash);
	if (!valid) {
		return c.json({ error: "Invalid credentials" }, 401);
	}

	// Check email verification
	if (!user.email_verified) {
		return c.json({ error: "Please verify your email first" }, 403);
	}

	// Generate tokens
	const accessToken: string = await signAccessToken(
		{ userId: user.id, email: user.email },
		c.env.JWT_SECRET,
	);

	const refreshToken: string = generateToken();
	const refreshTokenHash: string = await hashPassword(refreshToken);

	// Store refresh token
	const sessionId: string = generateId("sess");
	await c.env.DB.prepare(
		`INSERT INTO sessions (id, user_id, refresh_token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
	)
		.bind(
			sessionId,
			user.id,
			refreshTokenHash,
			Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
			Date.now(),
		)
		.run();

	return c.json({
		accessToken,
		refreshToken,
		user: {
			id: user.id,
			email: user.email,
		},
	});
});

/**
 * GET /auth/verify
 */
auth.get("/verify", async (c) => {
	const token: string | undefined = c.req.query("token");

	if (!token) {
		return c.json({ error: "Verification token required" }, 400);
	}

	const user: Record<string, unknown> | null = await c.env.DB.prepare(
		"SELECT id FROM users WHERE verification_token = ?",
	)
		.bind(token)
		.first();

	if (!user) {
		return c.json({ error: "Invalid verification token" }, 400);
	}

	await c.env.DB.prepare(
		"UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?",
	)
		.bind(user.id)
		.run();

	return c.json({ message: "Email verified successfully" });
});

/**
 * POST /auth/refresh
 */
auth.post("/refresh", async (c) => {
	const { refreshToken } = await c.req.json();

	if (!refreshToken) {
		return c.json({ error: "Refresh token required" }, 400);
	}

	// Get all sessions (we need to check each hash)
	const sessions: D1Result<Record<string, unknown>> = await c.env.DB.prepare(
		"SELECT id, user_id, refresh_token_hash, expires_at FROM sessions WHERE expires_at > ?",
	)
		.bind(Date.now())
		.all();

	let validSession: any = null;
	for (const session of sessions.results) {
		if (
			await verifyPassword(refreshToken, session.refresh_token_hash as string)
		) {
			validSession = session;
			break;
		}
	}

	if (!validSession) {
		return c.json({ error: "Invalid refresh token" }, 401);
	}

	// Get user
	const user = (await c.env.DB.prepare(
		"SELECT id, email FROM users WHERE id = ?",
	)
		.bind(validSession.user_id)
		.first()) as any;

	// Generate new access token
	const accessToken: string = await signAccessToken(
		{ userId: user.id, email: user.email },
		c.env.JWT_SECRET,
	);

	return c.json({ accessToken });
});

/**
 * POST /auth/logout
 */
auth.post("/logout", async (c) => {
	const { refreshToken } = await c.req.json();

	if (!refreshToken) {
		return c.json({ message: "Logged out" });
	}

	// Find and delete session
	const sessions: D1Result<Record<string, unknown>> = await c.env.DB.prepare(
		"SELECT id, refresh_token_hash FROM sessions",
	).all();

	for (const session of sessions.results) {
		if (
			await verifyPassword(refreshToken, session.refresh_token_hash as string)
		) {
			await c.env.DB.prepare("DELETE FROM sessions WHERE id = ?")
				.bind(session.id)
				.run();
			break;
		}
	}

	return c.json({ message: "Logged out successfully" });
});

export default auth;
