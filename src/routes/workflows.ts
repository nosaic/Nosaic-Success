// 'POST /workflows/trigger' (manual trigger)

import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import { decrypt } from "../utils/crypto";

const workflows = new Hono<{ Bindings: Env }>();

workflows.use("*", requireAuth);

/**
 * POST /workflows/trigger
 * Manually trigger workflow execution
 */
workflows.post("/trigger", async (c) => {
	const userId = c.get("userId");

	// Get workflow config
	const config = (await c.env.DB.prepare(
		"SELECT * FROM workflow_configs WHERE user_id = ?",
	)
		.bind(userId)
		.first()) as any;

	if (!config) {
		return c.json({ error: "No workflow configuration found" }, 404);
	}

	// Get OAuth connections
	const connections = await c.env.DB.prepare(
		"SELECT * FROM oauth_connections WHERE user_id = ?",
	)
		.bind(userId)
		.all();

	const connMap = new Map();
	for (const conn of connections.results as any[]) {
		connMap.set(conn.provider, conn);
	}

	// Get support connection (required)
	const supportConn = connMap.get(config.support_provider);
	if (!supportConn) {
		return c.json({ error: "Support platform not connected" }, 400);
	}

	const supportMetadata = supportConn.scope
		? JSON.parse(supportConn.scope)
		: {};

	// Get CRM connection (optional)
	let crmMetadata = null;
	if (config.crm_provider && config.crm_provider !== "none") {
		const crmConn = connMap.get(config.crm_provider);
		if (crmConn) {
			crmMetadata = crmConn.scope ? JSON.parse(crmConn.scope) : {};
		}
	}

	// Trigger workflow
	const instance = await c.env.CHURN_REPORT.create({
		params: {
			userId,
			crmProvider: config.crm_provider,
			crmMetadata,
			supportProvider: config.support_provider,
			supportMetadata,
			reportDestination: config.report_destination,
			destinationConfig: config.destination_config,
		},
	});

	return c.json({
		message: "Workflow triggered",
		workflowId: instance.id,
	});
});

/**
 * GET /workflows/status/:id
 * Check workflow execution status
 */
workflows.get("/status/:id", async (c) => {
	const workflowId = c.req.param("id");

	const instance = await c.env.CHURN_REPORT.get(workflowId);

	if (!instance) {
		return c.json({ error: "Workflow not found" }, 404);
	}

	return c.json({
		id: instance.id,
		status: instance.status,
	});
});

export default workflows;
