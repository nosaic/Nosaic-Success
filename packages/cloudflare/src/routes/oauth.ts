import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import {
	encrypt,
	generateId,
	authorizeHubSpot,
	callbackHubSpot,
	authorizeSalesforce,
	callbackSalesforce,
	authorizeZendesk,
	callbackZendesk,
	authorizeIntercom,
	callbackIntercom,
	authorizeFreshdesk,
	callbackFreshdesk,
} from "@nosaic/core";

const oauth = new Hono<{ Bindings: Env; Variables: Variables }>();

oauth.use("*", requireAuth);

// ==================== SALESFORCE ====================

oauth.get("/salesforce/authorize", async (c) => {
	const userId: string = c.get("userId");
	const url: string = authorizeSalesforce(c.env.SALESFORCE_CLIENT_ID, c.env.API_URL, userId);
	return c.redirect(url);
});

oauth.get("/salesforce/callback", async (c) => {
	const code: string | undefined = c.req.query("code");
	const state: string | undefined = c.req.query("state");

	if (!code || !state) return c.json({ error: "Missing code or state" }, 400);

	const { userId } = JSON.parse(atob(state));

	try {
		const metadata: {instanceUrl: string, clientId: string, clientSecret: string} =
            await callbackSalesforce(code, c.env.SALESFORCE_CLIENT_ID, c.env.SALESFORCE_CLIENT_SECRET, c.env.API_URL);
		const encryptedMetadata: string = await encrypt(JSON.stringify(metadata), c.env.ENCRYPTION_KEY);

		const connectionId: string = generateId("conn");
		await c.env.DB.prepare(
			`INSERT OR REPLACE INTO oauth_connections
	     (id, user_id, provider, encrypted_access_token, encrypted_refresh_token, token_expires_at, scope, created_at, updated_at)
	     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
			.bind(
				connectionId,
				userId,
				"salesforce",
				"",
				null,
				null,
				encryptedMetadata,
				Date.now(),
				Date.now(),
			)
			.run();

		return c.redirect(`${c.env.FRONTEND_URL}/connections?success=salesforce`);
	} catch (error) {
		return c.json({ error: "Failed to exchange code" }, 500);
	}
});

// ==================== HUBSPOT ====================

oauth.get("/hubspot/authorize", async (c) => {
	const userId: string = c.get("userId");
	const url: string = authorizeHubSpot(c.env.HUBSPOT_CLIENT_ID, c.env.API_URL, userId);
	return c.redirect(url);
});

oauth.get("/hubspot/callback", async (c) => {
	const code: string | undefined = c.req.query("code");
	const state: string | undefined = c.req.query("state");

	if (!code || !state) return c.json({ error: "Missing code or state" }, 400);

	const { userId } = JSON.parse(atob(state));

	try {
		const metadata: {clientId: string, clientSecret: string} = await callbackHubSpot(code, c.env.HUBSPOT_CLIENT_ID, c.env.HUBSPOT_CLIENT_SECRET, c.env.API_URL);
		const encryptedMetadata: string = await encrypt(JSON.stringify(metadata), c.env.ENCRYPTION_KEY);

		const connectionId: string = generateId("conn");
		await c.env.DB.prepare(
			`INSERT OR REPLACE INTO oauth_connections
	     (id, user_id, provider, encrypted_access_token, encrypted_refresh_token, token_expires_at, scope, created_at, updated_at)
	     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
			.bind(
				connectionId,
				userId,
				"hubspot",
				"",
				null,
				null,
				encryptedMetadata,
				Date.now(),
				Date.now(),
			)
			.run();

		return c.redirect(`${c.env.FRONTEND_URL}/connections?success=hubspot`);
	} catch (error) {
		return c.json({ error: "Failed to exchange code" }, 500);
	}
});

// ==================== ZENDESK ====================

oauth.get("/zendesk/authorize", async (c) => {
	const userId: string = c.get("userId");
	const subdomain: string | undefined = c.req.query("subdomain");

	if (!subdomain) return c.json({ error: "Subdomain required" }, 400);

	const url: string = authorizeZendesk(c.env.ZENDESK_CLIENT_ID, c.env.API_URL, userId, subdomain);
	return c.redirect(url);
});

oauth.get("/zendesk/callback", async (c) => {
	const code: string | undefined = c.req.query("code");
	const state: string | undefined = c.req.query("state");

	if (!code || !state) return c.json({ error: "Missing code or state" }, 400);

	const { userId, subdomain } = JSON.parse(atob(state));

	try {
		const metadata: {subdomain: string, clientId: string, clientSecret: string} =
            await callbackZendesk(code, c.env.ZENDESK_CLIENT_ID, c.env.ZENDESK_CLIENT_SECRET, c.env.API_URL, subdomain);
		const encryptedMetadata: string = await encrypt(JSON.stringify(metadata), c.env.ENCRYPTION_KEY);

		const connectionId: string = generateId("conn");
		await c.env.DB.prepare(
			`INSERT OR REPLACE INTO oauth_connections
	     (id, user_id, provider, encrypted_access_token, encrypted_refresh_token, token_expires_at, scope, created_at, updated_at)
	     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
			.bind(
				connectionId,
				userId,
				"zendesk",
				"",
				null,
				null,
				encryptedMetadata,
				Date.now(),
				Date.now(),
			)
			.run();

		return c.redirect(`${c.env.FRONTEND_URL}/connections?success=zendesk`);
	} catch (error) {
		return c.json({ error: "Failed to exchange code" }, 500);
	}
});

// ==================== INTERCOM ====================

oauth.get("/intercom/authorize", async (c) => {
	const userId: string = c.get("userId");
	const url: string = authorizeIntercom(c.env.INTERCOM_CLIENT_ID, c.env.API_URL, userId);
	return c.redirect(url);
});

oauth.get("/intercom/callback", async (c) => {
	const code: string | undefined = c.req.query("code");
	const state: string | undefined = c.req.query("state");

	if (!code || !state) return c.json({ error: "Missing code or state" }, 400);

	const { userId } = JSON.parse(atob(state));

	try {
		const metadata: {clientId: string, clientSecret: string} = await callbackIntercom(code, c.env.INTERCOM_CLIENT_ID, c.env.INTERCOM_CLIENT_SECRET, c.env.API_URL);
		const encryptedMetadata: string = await encrypt(JSON.stringify(metadata), c.env.ENCRYPTION_KEY);

		const connectionId: string = generateId("conn");
		await c.env.DB.prepare(
			`INSERT OR REPLACE INTO oauth_connections
	     (id, user_id, provider, encrypted_access_token, encrypted_refresh_token, token_expires_at, scope, created_at, updated_at)
	     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
			.bind(
				connectionId,
				userId,
				"intercom",
				"",
				null,
				null,
				encryptedMetadata,
				Date.now(),
				Date.now(),
			)
			.run();

		return c.redirect(`${c.env.FRONTEND_URL}/connections?success=intercom`);
	} catch (error) {
		return c.json({ error: "Failed to exchange code" }, 500);
	}
});

// ==================== FRESHDESK ====================

oauth.get("/freshdesk/authorize", async (c) => {
	const userId: string = c.get("userId");
	const subdomain: string | undefined = c.req.query("subdomain");

	if (!subdomain) return c.json({ error: "Subdomain required" }, 400);

	const url: string = authorizeFreshdesk(c.env.FRESHDESK_CLIENT_ID, c.env.API_URL, userId, subdomain);
	return c.redirect(url);
});

oauth.get("/freshdesk/callback", async (c) => {
	const code: string | undefined = c.req.query("code");
	const state: string | undefined = c.req.query("state");

	if (!code || !state) return c.json({ error: "Missing code or state" }, 400);

	const { userId, subdomain } = JSON.parse(atob(state));

	try {
		const metadata: {subdomain: string, clientId: string, clientSecret: string} =
            await callbackFreshdesk(code, c.env.FRESHDESK_CLIENT_ID, c.env.FRESHDESK_CLIENT_SECRET, c.env.API_URL, subdomain);
		const encryptedMetadata: string = await encrypt(JSON.stringify(metadata), c.env.ENCRYPTION_KEY);

		const connectionId: string = generateId("conn");
		await c.env.DB.prepare(
			`INSERT OR REPLACE INTO oauth_connections
	     (id, user_id, provider, encrypted_access_token, encrypted_refresh_token, token_expires_at, scope, created_at, updated_at)
	     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
			.bind(
				connectionId,
				userId,
				"freshdesk",
				"",
				null,
				null,
				encryptedMetadata,
				Date.now(),
				Date.now(),
			)
			.run();

		return c.redirect(`${c.env.FRONTEND_URL}/connections?success=freshdesk`);
	} catch (error) {
		return c.json({ error: "Failed to exchange code" }, 500);
	}
});

// ==================== DELETE CONNECTION ====================

oauth.delete("/connections/:id", async (c) => {
	const userId: string = c.get("userId");
	const connectionId: string = c.req.param("id");

	await c.env.DB.prepare(
		"DELETE FROM oauth_connections WHERE id = ? AND user_id = ?",
	)
		.bind(connectionId, userId)
		.run();

	return c.json({ message: "Connection removed" });
});

// ==================== LIST CONNECTIONS ====================

oauth.get("/connections", async (c) => {
	const userId: string = c.get("userId");

	const connections: D1Result<Record<string, unknown>> = await c.env.DB.prepare(
		"SELECT id, provider, created_at FROM oauth_connections WHERE user_id = ?",
	)
		.bind(userId)
		.all();

	return c.json({ connections: connections.results });
});

export default oauth;
