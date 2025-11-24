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
	env: Env,
): Promise<CRMCompany[]> {
	switch (provider) {
		case "hubspot":
			return await fetchHubSpot(credentials);
		case "salesforce":
			return await fetchSalesforce(credentials);
		default:
			throw new Error(`Unknown CRM provider: ${provider}`);
	}
}
