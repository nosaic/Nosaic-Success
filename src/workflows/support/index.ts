import { fetchZendesk } from "./zendesk";
import { fetchIntercom } from "./intercom";
import { fetchFreshdesk } from "./freshdesk";

export interface SupportCustomer {
	id: string;
	name: string;
	email: string;
	domain?: string | undefined;
	ticketCount: number;
	openTickets: number;
	avgCsat?: number;
	healthScore?: number;
	accountTier?: string;
	renewalDate?: string;
	openTicketPriority?: any;
	tickets?: any[];
}

export async function fetchSupport(
	provider: string,
	credentials: string,
	env: Env,
): Promise<SupportCustomer[]> {
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
