import { fetchHubSpot } from "./hubspot";
import { fetchSalesforce } from "./salesforce";

export interface CRMCompany {
	companyName: string;
	companyId: string;
	[key: string]: any;
}

export async function fetchCRM(
	provider: string,
	credentials: string,
): Promise<CRMCompany[]> {
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
