import { fetchHubSpot } from "./hubspot";
import { fetchSalesforce } from "./salesforce";
import type { StandardizedCRMCompany } from "../standardized-schemas";

export async function fetchCRM(
	provider: string,
	credentials: string,
): Promise<StandardizedCRMCompany[]> {
	const creds: any = JSON.parse(credentials);
	switch (provider) {
		case "hubspot":
			return await fetchHubSpot(creds.clientId, creds.clientSecret);
		case "salesforce":
			return await fetchSalesforce(creds.instanceUrl, creds.clientId, creds.clientSecret);
		default:
			throw new Error(`Unknown CRM provider: ${provider}`);
	}
}
