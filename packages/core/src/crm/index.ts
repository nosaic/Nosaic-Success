import { HubSpotCRM } from "./hubspot";
import { SalesforceCRM } from "./salesforce";
import type { StandardizedCRMCompany } from "../standardized-schemas";

export async function fetchCRM(
	provider: string,
	credentials: string,
): Promise<StandardizedCRMCompany[]> {
	const creds: any = JSON.parse(credentials);
	switch (provider) {
		case "hubspot":
			const hubspot = new HubSpotCRM(creds.clientId, creds.clientSecret);
			return await hubspot.fetchCompanies();
		case "salesforce":
			const salesforce = new SalesforceCRM(creds.instanceUrl, creds.clientId, creds.clientSecret);
			return await salesforce.fetchCompanies();
		default:
			throw new Error(`Unknown CRM provider: ${provider}`);
	}
}
