import { ZendeskSupport } from "./zendesk";
import { IntercomSupport } from "./intercom";
import { FreshdeskSupport } from "./freshdesk";
import type { StandardizedSupportCustomer } from "../standardized-schemas";

export async function fetchSupport(
	provider: string,
	credentials: string,
): Promise<StandardizedSupportCustomer[]> {
	const creds: any = JSON.parse(credentials);
	switch (provider) {
		case "zendesk":
			const zendesk = new ZendeskSupport(creds.subdomain, creds.clientId, creds.clientSecret);
			return await zendesk.fetchCustomers();
		case "intercom":
			const intercom = new IntercomSupport(creds.clientId, creds.clientSecret);
			return await intercom.fetchCustomers();
		case "freshdesk":
			const freshdesk = new FreshdeskSupport(creds.subdomain, creds.clientId, creds.clientSecret);
			return await freshdesk.fetchCustomers();
		default:
			throw new Error(`Unknown support provider: ${provider}`);
	}
}
