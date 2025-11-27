// Main Workflow Class

import {
	WorkflowEntrypoint,
	WorkflowStep,
	type WorkflowEvent,
} from "cloudflare:workers";
import {
    fetchCRM,
    fetchSupport,
    combineData,
    generateChurnReport,
    sendEmail,
    sendSlack,
    generateId, type StandardizedCRMCompany, type StandardizedSupportCustomer, type StandardizedCombinedCompany,
} from "@nosaic/core";

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
	async run(event: WorkflowEvent<WorkflowParams>, step: WorkflowStep): Promise<{ success: boolean; userId: string }> {
		const params = (event as any).params as WorkflowParams;

		// Step 1: Fetch CRM data (auto-retries on failure)
		const crmData: StandardizedCRMCompany[] | null = await step.do("fetch CRM data", async (): Promise<StandardizedCRMCompany[] | null> => {
			if (!params.crmProvider || !params.crmMetadata) {
				return null;
			}
			return await fetchCRM(params.crmProvider, JSON.stringify(params.crmMetadata));
		});

		// Step 2: Fetch support platform data
		const supportData: StandardizedSupportCustomer[] = await step.do("fetch support data", async (): Promise<StandardizedSupportCustomer[]> => {
			const providerUpper: string = params.supportProvider.toUpperCase();
			const credentials = {
				...params.supportMetadata,
				clientId: this.env[`${providerUpper}_CLIENT_ID` as keyof Env],
				clientSecret: this.env[`${providerUpper}_CLIENT_SECRET` as keyof Env],
			};
			return await fetchSupport(params.supportProvider, JSON.stringify(credentials));
		});

		// Step 3: Combine data into company objects
		const companies: StandardizedCombinedCompany[] = await step.do("combine data", async (): Promise<StandardizedCombinedCompany[]> => {
			return combineData(
				crmData,
				supportData,
				params.crmProvider || "none",
				params.supportProvider,
			);
		});

		// Step 4: Generate AI churn report
		const report: string = await step.do("generate AI report", async (): Promise<string> => {
			return await generateChurnReport(companies, this.env.OPENROUTER_API_KEY);
		});

		// Step 5: Send report
		await step.do("send report", async (): Promise<void> => {
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
		await step.do("log report", async (): Promise<void> => {
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
