// Main Workflow Class

import {
	WorkflowEntrypoint,
	WorkflowStep,
	type WorkflowEvent,
} from "cloudflare:workers";
import { fetchCRM } from "./crm/index";
import { fetchSupport } from "./support/index";
import { combineData } from "./combiner";
import { generateChurnReport } from "./ai-report";
import { sendEmail } from "../utils/email";
import { sendSlack } from "../utils/slack";
import { generateId } from "../utils/crypto";

interface WorkflowParams {
	userId: string;
	crmProvider: string | null;
	crmMetadata: any;
	supportProvider: string;
	supportMetadata: any;
	reportDestination: "email" | "slack";
	destinationConfig: string;
}

export class ChurnReportWorkflow extends WorkflowEntrypoint<
	Env,
	WorkflowParams
> {
	async run(event: WorkflowEvent<WorkflowParams>, step: WorkflowStep) {
		const params = event.params;

		// Step 1: Fetch CRM data (auto-retries on failure)
		const crmData = await step.do("fetch CRM data", async () => {
			if (!params.crmProvider || !params.crmMetadata) {
				return null;
			}
			// Pass metadata as JSON string
			const credentials = JSON.stringify(params.crmMetadata);
			return await fetchCRM(params.crmProvider, credentials, this.env);
		});

		// Step 2: Fetch support platform data
		const supportData = await step.do("fetch support data", async () => {
			// Pass metadata as JSON string
			const credentials = JSON.stringify({
				...params.supportMetadata,
				clientId: this.env[`${params.supportProvider.toUpperCase()}_CLIENT_ID`],
				clientSecret:
					this.env[`${params.supportProvider.toUpperCase()}_CLIENT_SECRET`],
			});
			return await fetchSupport(params.supportProvider, credentials, this.env);
		});

		// Step 3: Combine data into company objects
		const companies = await step.do("combine data", async () => {
			return combineData(
				crmData,
				supportData,
				params.crmProvider || "none",
				params.supportProvider,
			);
		});

		// Step 4: Generate AI churn report
		const report = await step.do("generate AI report", async () => {
			return await generateChurnReport(companies, this.env.OPENROUTER_API_KEY);
		});

		// Step 5: Send report
		await step.do("send report", async () => {
			if (params.reportDestination === "email") {
				await sendEmail(
					report,
					params.destinationConfig,
					this.env.RESEND_API_KEY,
				);
			} else {
				await sendSlack(report, params.destinationConfig);
			}
		});

		// Step 6: Log completion to database
		await step.do("log report", async () => {
			await this.env.DB.prepare(
				`INSERT INTO reports (id, user_id, report_content, status, created_at)
         VALUES (?, ?, ?, ?, ?)`,
			)
				.bind(generateId("rpt"), params.userId, report, "success", Date.now())
				.run();

			await this.env.DB.prepare(
				"UPDATE workflow_configs SET last_run_at = ? WHERE user_id = ?",
			)
				.bind(Date.now(), params.userId)
				.run();
		});

		return { success: true, userId: params.userId };
	}
}
