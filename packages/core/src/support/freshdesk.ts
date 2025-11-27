import type { StandardizedSupportCustomer } from "../standardized-schemas";
import { SupportProvider } from "./provider";

interface FreshdeskConfig {
	subdomain: string;
	clientId: string;
	clientSecret: string;
}

const STATUS_MAP: any = {
	2: "Open",
	3: "Pending",
	4: "Resolved",
	5: "Closed",
};

const PRIORITY_MAP: any = {
	1: "Low",
	2: "Medium",
	3: "High",
	4: "Urgent",
};

export class FreshdeskSupport extends SupportProvider {
	private config: FreshdeskConfig;

	constructor(subdomain: string, clientId: string, clientSecret: string) {
		super();
		this.config = { subdomain, clientId, clientSecret };
	}

	private async getAccessToken(): Promise<string> {
		const response: Response = await fetch(
			`https://${this.config.subdomain}.freshdesk.com/oauth/token`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					grant_type: "client_credentials",
					client_id: this.config.clientId,
					client_secret: this.config.clientSecret,
				}),
			},
		);

		if (!response.ok)
			throw new Error(`Freshdesk token error: ${response.statusText}`);

		const data = await response.json() as { access_token: string };
		return data.access_token;
	}

	async fetchCustomers(): Promise<StandardizedSupportCustomer[]> {
		const accessToken: string = await this.getAccessToken();

		const ticketsRes: Response = await fetch(
			`https://${this.config.subdomain}.freshdesk.com/api/v2/tickets`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
			},
		);

		if (!ticketsRes.ok)
			throw new Error(`Freshdesk API error: ${ticketsRes.statusText}`);

		const tickets = await ticketsRes.json() as any[];

		const groupedData: any = {};
		tickets.forEach((t: any): void => {
			const companyId: any = t.company_id || "Unknown";

			const cleanedTicket = {
				ticketSubject: t.subject,
				ticketId: String(t.id),
				ticketType: t.type,
				ticketStatus: STATUS_MAP[t.status] || t.status,
				ticketPriority: PRIORITY_MAP[t.priority] || t.priority,
				ticketCreatedAt: t.created_at,
				ticketUpdatedAt: t.updated_at,
				ticketAgeHours: Math.round(
					(Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60),
				),
				ticketDueAt: t.due_by,
				tags: t.tags,
				sentimentScore: t.sentiment_score,
			};

			if (!groupedData[companyId]) {
				groupedData[companyId] = {
					companyId,
					openTicketsCount: 0,
					openTicketPriorities: { low: 0, medium: 0, high: 0, urgent: 0 },
					tickets: [],
				};
			}

			groupedData[companyId].tickets.push(cleanedTicket);

			if (t.status === 2) {
				groupedData[companyId].openTicketsCount++;
				const priorityName: any = PRIORITY_MAP[t.priority]?.toLowerCase();
				if (
					priorityName &&
					groupedData[companyId].openTicketPriorities[priorityName] !== undefined
				) {
					groupedData[companyId].openTicketPriorities[priorityName]++;
				}
			}
		});

		const companiesRes: Response = await fetch(
			`https://${this.config.subdomain}.freshdesk.com/api/v2/companies`,
			{ headers: { Authorization: `Bearer ${accessToken}` } },
		);
		const companies = await companiesRes.json() as any[];

		const companyMap: any = {};
		companies.forEach((company: any): void => {
			companyMap[company.id] = {
				companyName: company.name || null,
				healthScore: company.health_score || null,
				accountTier: company.account_tier || null,
				renewalDate: company.renewal_date || null,
			};
		});

		return Object.values(groupedData).map((companyEntry: any): StandardizedSupportCustomer => {
			const details: any = companyMap[companyEntry.companyId] || {};
			return {
				id: String(companyEntry.companyId),
				name: details.companyName || "Unknown Company",
				ticketCount: companyEntry.tickets.length,
				openTickets: companyEntry.openTicketsCount,
				healthScore: details.healthScore || undefined,
				accountTier: details.accountTier || undefined,
				renewalDate: details.renewalDate || undefined,
				openTicketPriorities: companyEntry.openTicketPriorities,
				tickets: companyEntry.tickets,
			};
		});
	}

	authorize(clientId: string, redirectUri: string, userId: string, subdomain?: string): string {
		const state: string = btoa(JSON.stringify({ userId, provider: "freshdesk", subdomain: subdomain || this.config.subdomain }));
		const params = new URLSearchParams({
			client_id: clientId,
			redirect_uri: `${redirectUri}/oauth/freshdesk/callback`,
			response_type: "code",
			state,
		});
		return `https://${subdomain || this.config.subdomain}.freshdesk.com/oauth/authorize?${params}`;
	}

	async callback(code: string, clientId: string, clientSecret: string, redirectUri: string, subdomain?: string):
	    Promise<{ subdomain: string; clientId: string; clientSecret: string }> {
		const tokenResponse: Response = await fetch(
			`https://${subdomain || this.config.subdomain}.freshdesk.com/oauth/token`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					code,
					client_id: clientId,
					client_secret: clientSecret,
					redirect_uri: `${redirectUri}/oauth/freshdesk/callback`,
					grant_type: "authorization_code",
				}),
			},
		);

		if (!tokenResponse.ok) {
			throw new Error(`Freshdesk OAuth error: ${tokenResponse.statusText}`);
		}

		return { subdomain: subdomain || this.config.subdomain, clientId, clientSecret };
	}
}

