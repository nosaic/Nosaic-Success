// 'GET/PUT /user/settings', '/connections'

import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import { encrypt } from "@nosaic-success/core";

const dashboard = new Hono<{ Bindings: Env; Variables: Variables }>();

// Apply auth to all routes
dashboard.use("*", requireAuth);

/**
 * GET /dashboard/config
 * Get user's workflow configuration
 */
dashboard.get("/config", async (c) => {
	const userId: string = c.get("userId");

	const config: Record<string, unknown> | null = await c.env.DB.prepare(
		"SELECT * FROM workflow_configs WHERE user_id = ?",
	)
		.bind(userId)
		.first();

	if (!config) {
		return c.json({
			crmProvider: null,
			supportProvider: null,
			reportFrequency: "weekly",
			reportDestination: "email",
			destinationConfig: "",
			enabled: false,
		});
	}

	return c.json({
		crmProvider: config.crm_provider,
		supportProvider: config.support_provider,
		reportFrequency: config.report_frequency,
		reportDestination: config.report_destination,
		destinationConfig: config.destination_config,
		enabled: config.enabled === 1,
		lastRunAt: config.last_run_at,
		nextRunAt: config.next_run_at,
	});
});

/**
 * PUT /dashboard/config
 * Update workflow configuration
 */
dashboard.put("/config", async (c) => {
	const userId: string = c.get("userId");
	const { reportFrequency, reportDestination, destinationConfig } =
		await c.req.json();

	// Validate
	if (!["daily", "weekly", "monthly"].includes(reportFrequency)) {
		return c.json({ error: "Invalid frequency" }, 400);
	}

	if (!["email", "slack"].includes(reportDestination)) {
		return c.json({ error: "Invalid destination" }, 400);
	}

	if (!destinationConfig) {
		return c.json({ error: "Destination config required" }, 400);
	}

	// Calculate next run time
	const now: number = Date.now();
	const nextRun: number = calculateNextRun(reportFrequency, now);

	// Check if config exists
	const existing: Record<string, unknown> | null = await c.env.DB.prepare(
		"SELECT user_id FROM workflow_configs WHERE user_id = ?",
	)
		.bind(userId)
		.first();

	if (existing) {
		await c.env.DB.prepare(
			`UPDATE workflow_configs
       SET report_frequency = ?, report_destination = ?, destination_config = ?,
           next_run_at = ?, updated_at = ?
       WHERE user_id = ?`,
		)
			.bind(
				reportFrequency,
				reportDestination,
				destinationConfig,
				nextRun,
				now,
				userId,
			)
			.run();
	} else {
		await c.env.DB.prepare(
			`INSERT INTO workflow_configs (
        user_id, report_frequency, report_destination, destination_config,
        next_run_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		)
			.bind(
				userId,
				reportFrequency,
				reportDestination,
				destinationConfig,
				nextRun,
				now,
				now,
			)
			.run();
	}

	return c.json({ message: "Configuration updated" });
});

/**
 * POST /dashboard/config/toggle
 * Enable/disable workflow execution
 */
dashboard.post("/config/toggle", async (c) => {
	const userId: string = c.get("userId");

	const config: Record<string, unknown> | null = await c.env.DB.prepare(
		"SELECT enabled FROM workflow_configs WHERE user_id = ?",
	)
		.bind(userId)
		.first();

	if (!config) {
		return c.json({ error: "No configuration found" }, 404);
	}

	const newState: 0 | 1 = config.enabled === 1 ? 0 : 1;

	await c.env.DB.prepare(
		"UPDATE workflow_configs SET enabled = ?, updated_at = ? WHERE user_id = ?",
	)
		.bind(newState, Date.now(), userId)
		.run();

	return c.json({ enabled: newState === 1 });
});

/**
 * POST /dashboard/integrations/crm
 * Set CRM provider credentials
 */
dashboard.post("/integrations/crm", async (c) => {
	const userId: string = c.get("userId");
	const { provider, apiKey } = await c.req.json();

	if (!["hubspot", "salesforce", "none"].includes(provider)) {
		return c.json({ error: "Invalid CRM provider" }, 400);
	}

	const encryptedCreds: string | null =
		provider === "none" ? null : await encrypt(apiKey, c.env.ENCRYPTION_KEY);

	const existing: Record<string, unknown> | null = await c.env.DB.prepare(
		"SELECT user_id FROM workflow_configs WHERE user_id = ?",
	)
		.bind(userId)
		.first();

	if (existing) {
		await c.env.DB.prepare(
			`UPDATE workflow_configs
       SET crm_provider = ?, crm_encrypted_credentials = ?, updated_at = ?
       WHERE user_id = ?`,
		)
			.bind(
				provider === "none" ? null : provider,
				encryptedCreds,
				Date.now(),
				userId,
			)
			.run();
	} else {
		return c.json({ error: "Create basic config first" }, 400);
	}

	return c.json({ message: "CRM integration updated" });
});

/**
 * POST /dashboard/integrations/support
 * Set support provider credentials
 */
dashboard.post("/integrations/support", async (c) => {
	const userId: string = c.get("userId");
	const { provider, apiKey } = await c.req.json();

	if (!["zendesk", "intercom"].includes(provider)) {
		return c.json({ error: "Invalid support provider" }, 400);
	}

	const encryptedCreds: string = await encrypt(apiKey, c.env.ENCRYPTION_KEY);

	const existing: Record<string, unknown> | null = await c.env.DB.prepare(
		"SELECT user_id FROM workflow_configs WHERE user_id = ?",
	)
		.bind(userId)
		.first();

	if (existing) {
		await c.env.DB.prepare(
			`UPDATE workflow_configs
       SET support_provider = ?, support_encrypted_credentials = ?, updated_at = ?
       WHERE user_id = ?`,
		)
			.bind(provider, encryptedCreds, Date.now(), userId)
			.run();
	} else {
		return c.json({ error: "Create basic config first" }, 400);
	}

	return c.json({ message: "Support integration updated" });
});

/**
 * GET /dashboard/reports
 * Get report history
 */
dashboard.get("/reports", async (c) => {
	const userId: string = c.get("userId");
	const limit: number = parseInt(c.req.query("limit") || "10");

	const reports: D1Result<Record<string, unknown>> = await c.env.DB.prepare(
		`SELECT id, status, error_message, created_at
     FROM reports
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
	)
		.bind(userId, limit)
		.all();

	return c.json({ reports: reports.results });
});

/**
 * GET /dashboard/reports/:id
 * Get specific report content
 */
dashboard.get("/reports/:id", async (c) => {
	const userId: string = c.get("userId");
	const reportId: string = c.req.param("id");

	const report: Record<string, unknown> | null = await c.env.DB.prepare(
		"SELECT * FROM reports WHERE id = ? AND user_id = ?",
	)
		.bind(reportId, userId)
		.first();

	if (!report) {
		return c.json({ error: "Report not found" }, 404);
	}

	return c.json({
		id: report.id,
		content: report.report_content,
		status: report.status,
		createdAt: report.created_at,
	});
});

function calculateNextRun(
	frequency: string,
	from: number = Date.now(),
): number {
	const date = new Date(from);

	switch (frequency) {
		case "daily":
			date.setDate(date.getDate() + 1);
			break;
		case "weekly":
			date.setDate(date.getDate() + 7);
			break;
		case "monthly":
			date.setMonth(date.getMonth() + 1);
			break;
	}

	return date.getTime();
}

export default dashboard;
