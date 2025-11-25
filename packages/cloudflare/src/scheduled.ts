export async function handleScheduled(env: Env): Promise<void> {
	const now: number = Date.now();

	// Get workflows that need to run
	const configs: D1Result<Record<string, unknown>> = await env.DB.prepare(
		"SELECT * FROM workflow_configs WHERE enabled = 1 AND next_run_at <= ?",
	)
		.bind(now)
		.all();

	console.log(`Found ${configs.results.length} workflows to execute`);

	for (const config of configs.results as any[]) {
		try {
			// Get OAuth connections for this user
			const connections: D1Result<Record<string, unknown>> = await env.DB.prepare(
				"SELECT * FROM oauth_connections WHERE user_id = ?",
			)
				.bind(config.user_id)
				.all();

			const connMap = new Map();
			for (const conn of connections.results as any[]) {
				connMap.set(conn.provider, conn);
			}

			// Get support connection
			const supportConn: any = connMap.get(config.support_provider);
			if (!supportConn) {
				console.error(`No support connection for user ${config.user_id}`);
				continue;
			}

			const supportMetadata: any = supportConn.scope
				? JSON.parse(supportConn.scope)
				: {};

			// Get CRM connection (optional)
			let crmMetadata: any = null;
			if (config.crm_provider && config.crm_provider !== "none") {
				const crmConn: any = connMap.get(config.crm_provider);
				if (crmConn) {
					crmMetadata = crmConn.scope ? JSON.parse(crmConn.scope) : {};
				}
			}

			// Trigger workflow
			await env.CHURN_REPORT.create({
				params: {
					userId: config.user_id,
					crmProvider: config.crm_provider,
					crmMetadata,
					supportProvider: config.support_provider,
					supportMetadata,
					reportDestination: config.report_destination,
					destinationConfig: config.destination_config,
				},
			});

			// Calculate and update next run
			const nextRun: number = calculateNextRun(config.report_frequency, now);
			await env.DB.prepare(
				"UPDATE workflow_configs SET next_run_at = ? WHERE user_id = ?",
			)
				.bind(nextRun, config.user_id)
				.run();

			console.log(`Triggered workflow for user ${config.user_id}`);
		} catch (error) {
			console.error(
				`Failed to trigger workflow for user ${config.user_id}:`,
				error,
			);
		}
	}
}

function calculateNextRun(frequency: string, from: number): number {
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
