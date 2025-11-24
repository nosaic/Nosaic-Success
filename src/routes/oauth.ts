import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import { encrypt, generateId } from "../utils/crypto";

const oauth = new Hono<{ Bindings: Env; Variables: Variables }>();

oauth.use("*", requireAuth);

// ==================== SALESFORCE ====================

oauth.get("/salesforce/authorize", async (c) => {
	const userId = c.get("userId");
	const state = btoa(JSON.stringify({ userId, provider: "salesforce" }));

	const params = new URLSearchParams({
		client_id: c.env.SALESFORCE_CLIENT_ID,
		redirect_uri: `${c.env.API_URL}/oauth/salesforce/callback`,
		response_type: "code",
		state,
	});

	return c.redirect(
		`https://login.salesforce.com/services/oauth2/authorize?${params}`,
	);
});

oauth.get("/salesforce/callback", async (c) => {
	const code = c.req.query("code");
	const state = c.req.query("state");

	if (!code || !state) return c.json({ error: "Missing code or state" }, 400);

	const { userId } = JSON.parse(atob(state));

	const tokenResponse = await fetch(
		"https://login.salesforce.com/services/oauth2/token",
		{
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				code,
				client_id: c.env.SALESFORCE_CLIENT_ID,
				client_secret: c.env.SALESFORCE_CLIENT_SECRET,
				redirect_uri: `${c.env.API_URL}/oauth/salesforce/callback`,
				grant_type: "authorization_code",
			}),
		},
	);

	if (!tokenResponse.ok)
		return c.json({ error: "Failed to exchange code" }, 500);

	const tokens = await tokenResponse.json();

	// Store client credentials and instance URL in metadata
	const metadata = JSON.stringify({
		instanceUrl: tokens.instance_url,
		clientId: c.env.SALESFORCE_CLIENT_ID,
		clientSecret: c.env.SALESFORCE_CLIENT_SECRET,
	});

	const connectionId = generateId("conn");
	await c.env.DB.prepare(
		`INSERT OR REPLACE INTO oauth_connections
     (id, user_id, provider, encrypted_access_token, encrypted_refresh_token, token_expires_at, scope, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	)
		.bind(
			connectionId,
			userId,
			"salesforce",
			"", // Not storing user token, using client credentials flow
			null,
			null,
			metadata,
			Date.now(),
			Date.now(),
		)
		.run();

	return c.redirect(`${c.env.FRONTEND_URL}/connections?success=salesforce`);
});

// ==================== HUBSPOT ====================

oauth.get("/hubspot/authorize", async (c) => {
	const userId = c.get("userId");
	const state = btoa(JSON.stringify({ userId, provider: "hubspot" }));

	const params = new URLSearchParams({
		client_id: c.env.HUBSPOT_CLIENT_ID,
		redirect_uri: `${c.env.API_URL}/oauth/hubspot/callback`,
		scope: "crm.objects.companies.read",
		state,
	});

	return c.redirect(`https://app.hubspot.com/oauth/authorize?${params}`);
});

oauth.get("/hubspot/callback", async (c) => {
	const code = c.req.query("code");
	const state = c.req.query("state");

	if (!code || !state) return c.json({ error: "Missing code or state" }, 400);

	const { userId } = JSON.parse(atob(state));

	// Exchange code to verify connection (optional, can skip if not needed)
	const tokenResponse = await fetch("https://api.hubapi.com/oauth/v1/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			code,
			client_id: c.env.HUBSPOT_CLIENT_ID,
			client_secret: c.env.HUBSPOT_CLIENT_SECRET,
			redirect_uri: `${c.env.API_URL}/oauth/hubspot/callback`,
			grant_type: "authorization_code",
		}),
	});

	if (!tokenResponse.ok)
		return c.json({ error: "Failed to exchange code" }, 500);

	// Store client credentials in metadata
	const metadata = JSON.stringify({
		clientId: c.env.HUBSPOT_CLIENT_ID,
		clientSecret: c.env.HUBSPOT_CLIENT_SECRET,
	});

	const connectionId = generateId("conn");
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
			metadata,
			Date.now(),
			Date.now(),
		)
		.run();

	return c.redirect(`${c.env.FRONTEND_URL}/connections?success=hubspot`);
});

// ==================== ZENDESK ====================

oauth.get("/zendesk/authorize", async (c) => {
	const userId = c.get("userId");
	const subdomain = c.req.query("subdomain");

	if (!subdomain) return c.json({ error: "Subdomain required" }, 400);

	const state = btoa(
		JSON.stringify({ userId, provider: "zendesk", subdomain }),
	);

	const params = new URLSearchParams({
		client_id: c.env.ZENDESK_CLIENT_ID,
		redirect_uri: `${c.env.API_URL}/oauth/zendesk/callback`,
		response_type: "code",
		scope: "read write",
		state,
	});

	return c.redirect(
		`https://${subdomain}.zendesk.com/oauth/authorizations/new?${params}`,
	);
});

oauth.get("/zendesk/callback", async (c) => {
	const code = c.req.query("code");
	const state = c.req.query("state");

	if (!code || !state) return c.json({ error: "Missing code or state" }, 400);

	const { userId, subdomain } = JSON.parse(atob(state));

	// Verify connection
	const tokenResponse = await fetch(
		`https://${subdomain}.zendesk.com/oauth/tokens`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				code,
				client_id: c.env.ZENDESK_CLIENT_ID,
				client_secret: c.env.ZENDESK_CLIENT_SECRET,
				redirect_uri: `${c.env.API_URL}/oauth/zendesk/callback`,
				grant_type: "authorization_code",
			}),
		},
	);

	if (!tokenResponse.ok)
		return c.json({ error: "Failed to exchange code" }, 500);

	const metadata = JSON.stringify({
		subdomain,
		clientId: c.env.ZENDESK_CLIENT_ID,
		clientSecret: c.env.ZENDESK_CLIENT_SECRET,
	});

	const connectionId = generateId("conn");
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
			metadata,
			Date.now(),
			Date.now(),
		)
		.run();

	return c.redirect(`${c.env.FRONTEND_URL}/connections?success=zendesk`);
});

// ==================== INTERCOM ====================

oauth.get("/intercom/authorize", async (c) => {
	const userId = c.get("userId");
	const state = btoa(JSON.stringify({ userId, provider: "intercom" }));

	const params = new URLSearchParams({
		client_id: c.env.INTERCOM_CLIENT_ID,
		redirect_uri: `${c.env.API_URL}/oauth/intercom/callback`,
		state,
	});

	return c.redirect(`https://app.intercom.com/oauth?${params}`);
});

oauth.get("/intercom/callback", async (c) => {
	const code = c.req.query("code");
	const state = c.req.query("state");

	if (!code || !state) return c.json({ error: "Missing code or state" }, 400);

	const { userId } = JSON.parse(atob(state));

	// Verify connection
	const tokenResponse = await fetch(
		"https://api.intercom.io/auth/eagle/token",
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				code,
				client_id: c.env.INTERCOM_CLIENT_ID,
				client_secret: c.env.INTERCOM_CLIENT_SECRET,
				redirect_uri: `${c.env.API_URL}/oauth/intercom/callback`,
			}),
		},
	);

	if (!tokenResponse.ok)
		return c.json({ error: "Failed to exchange code" }, 500);

	const metadata = JSON.stringify({
		clientId: c.env.INTERCOM_CLIENT_ID,
		clientSecret: c.env.INTERCOM_CLIENT_SECRET,
	});

	const connectionId = generateId("conn");
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
			metadata,
			Date.now(),
			Date.now(),
		)
		.run();

	return c.redirect(`${c.env.FRONTEND_URL}/connections?success=intercom`);
});

// ==================== FRESHDESK ====================

oauth.get("/freshdesk/authorize", async (c) => {
	const userId = c.get("userId");
	const subdomain = c.req.query("subdomain");

	if (!subdomain) return c.json({ error: "Subdomain required" }, 400);

	const state = btoa(
		JSON.stringify({ userId, provider: "freshdesk", subdomain }),
	);

	const params = new URLSearchParams({
		client_id: c.env.FRESHDESK_CLIENT_ID,
		redirect_uri: `${c.env.API_URL}/oauth/freshdesk/callback`,
		response_type: "code",
		state,
	});

	return c.redirect(
		`https://${subdomain}.freshdesk.com/oauth/authorize?${params}`,
	);
});

oauth.get("/freshdesk/callback", async (c) => {
	const code = c.req.query("code");
	const state = c.req.query("state");

	if (!code || !state) return c.json({ error: "Missing code or state" }, 400);

	const { userId, subdomain } = JSON.parse(atob(state));

	// Verify connection
	const tokenResponse = await fetch(
		`https://${subdomain}.freshdesk.com/oauth/token`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				code,
				client_id: c.env.FRESHDESK_CLIENT_ID,
				client_secret: c.env.FRESHDESK_CLIENT_SECRET,
				redirect_uri: `${c.env.API_URL}/oauth/freshdesk/callback`,
				grant_type: "authorization_code",
			}),
		},
	);

	if (!tokenResponse.ok)
		return c.json({ error: "Failed to exchange code" }, 500);

	const metadata = JSON.stringify({
		subdomain,
		clientId: c.env.FRESHDESK_CLIENT_ID,
		clientSecret: c.env.FRESHDESK_CLIENT_SECRET,
	});

	const connectionId = generateId("conn");
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
			metadata,
			Date.now(),
			Date.now(),
		)
		.run();

	return c.redirect(`${c.env.FRONTEND_URL}/connections?success=freshdesk`);
});

// ==================== DELETE CONNECTION ====================

oauth.delete("/connections/:id", async (c) => {
	const userId = c.get("userId");
	const connectionId = c.req.param("id");

	await c.env.DB.prepare(
		"DELETE FROM oauth_connections WHERE id = ? AND user_id = ?",
	)
		.bind(connectionId, userId)
		.run();

	return c.json({ message: "Connection removed" });
});

// ==================== LIST CONNECTIONS ====================

oauth.get("/connections", async (c) => {
	const userId = c.get("userId");

	const connections = await c.env.DB.prepare(
		"SELECT id, provider, created_at FROM oauth_connections WHERE user_id = ?",
	)
		.bind(userId)
		.all();

	return c.json({ connections: connections.results });
});

export default oauth;
