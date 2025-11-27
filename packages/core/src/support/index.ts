import { fetchZendesk } from "./zendesk";
import { fetchIntercom } from "./intercom";
import { fetchFreshdesk } from "./freshdesk";
import type { StandardizedSupportCustomer } from "../standardized-schemas";

export async function fetchSupport(
	provider: string,
	credentials: string,
): Promise<StandardizedSupportCustomer[]> {
	switch (provider) {
		case "zendesk":
			return await fetchZendesk(credentials);
		case "intercom":
			return await fetchIntercom(credentials);
		case "freshdesk":
			return await fetchFreshdesk(credentials);
		default:
			throw new Error(`Unknown support provider: ${provider}`);
	}
}
