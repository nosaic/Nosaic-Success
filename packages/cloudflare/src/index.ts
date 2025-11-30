// Main router

import { Hono } from "hono";
import { cors } from "hono/cors";
import dashboard from "./routes/dashboard";
import workflows from "./routes/workflows";
import oauth from "./routes/oauth";
import { handleScheduled } from "./scheduled";

const app = new Hono<{ Bindings: Env }>();

// CORS
app.use(
	"*",
	cors({
		origin: (origin: string): string => origin,
		credentials: true,
	}),
);

// Routes
app.route("/dashboard", dashboard);
app.route("/workflows", workflows);
app.route("/oauth", oauth);

// Health check
app.get("/", (c) => c.json({ status: "ok" }));

export default {
	fetch: app.fetch,
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		ctx.waitUntil(handleScheduled(env));
	},
};

// Export workflow
export { ChurnReportWorkflow } from "./workflows/ChurnReportWorkflow";
