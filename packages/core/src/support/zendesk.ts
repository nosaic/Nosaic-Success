import type { SupportCustomer } from "./index";

interface ZendeskConfig {
	subdomain: string;
	clientId: string;
	clientSecret: string;
}

async function getAccessToken(config: ZendeskConfig): Promise<string> {
	const response: Response = await fetch(
		`https://${config.subdomain}.zendesk.com/oauth/tokens`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				grant_type: "client_credentials",
				client_id: config.clientId,
				client_secret: config.clientSecret,
				scope: "read write",
			}),
		},
	);

	if (!response.ok)
		throw new Error(`Zendesk token error: ${response.statusText}`);

	const data = await response.json() as { access_token: string };
	return data.access_token;
}

export async function fetchZendesk(
	configJson: string,
): Promise<SupportCustomer[]> {
	const config: ZendeskConfig = JSON.parse(configJson);
	const accessToken: string = await getAccessToken(config);

	const ticketsRes: Response = await fetch(
		`https://${config.subdomain}.zendesk.com/api/v2/tickets.json`,
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
		},
	);

	if (!ticketsRes.ok)
		throw new Error(`Zendesk API error: ${ticketsRes.statusText}`);

	const ticketsData = await ticketsRes.json() as { tickets: any[] };
	const tickets: any[] = ticketsData.tickets;

	function csatScore(ticket: any): number | null {
		const score: any = ticket.satisfaction_rating?.score;
		return !score || score === "unoffered" ? null : score === "good" ? 1 : 0;
	}

	const grouped: any = {};
	tickets.forEach((ticket: any): void => {
		const orgId: any = ticket.organization_id || "unknown_company";
		if (!grouped[orgId]) grouped[orgId] = [];
		grouped[orgId].push(ticket);
	});

	const orgsRes: Response = await fetch(
		`https://${config.subdomain}.zendesk.com/api/v2/organizations.json`,
		{ headers: { Authorization: `Bearer ${accessToken}` } },
	);
	const orgsData = await orgsRes.json() as { organizations: any[] };

	const companyLookup: any = {};
	orgsData.organizations.forEach((org: any): void => {
		companyLookup[org.id] = org.name;
	});

	const output = Object.entries(grouped).map(([companyId, orgTickets]: any) => {
		const openTicketsList: any = orgTickets.filter(
			(t: any): boolean => t.status === "open" || t.status === "pending",
		);
		const solvedTicketsList: any = orgTickets.filter(
			(t: any): boolean => t.status === "solved",
		);

		const priorityCounts = { low: 0, normal: 0, high: 0, urgent: 0 };
		openTicketsList.forEach((t: any): void => {
			const priority: any = t.priority || "normal";
			if (priorityCounts[priority as keyof typeof priorityCounts] != null) {
				priorityCounts[priority as keyof typeof priorityCounts]++;
			}
		});

		const csatScores: any = solvedTicketsList
			.map(csatScore)
			.filter((s: any): boolean => s != null);
		const avgCsat: number | null =
			csatScores.length > 0
				? csatScores.reduce((a: number, b: number): number => a + b, 0) / csatScores.length
				: null;

		const filteredTickets: any = openTicketsList.map((t: any) => ({
			ticketSubject: t.subject,
			ticketId: t.id,
			ticketType: t.type,
			ticketStatus: t.status,
			ticketPriority: t.priority,
			ticketCreatedAt: t.created_at,
			ticketUpdatedAt: t.updated_at,
			ticketAgeHours: Math.round(
				(Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60),
			),
			ticketDueAt: t.due_at,
			ticketTags: t.tags,
		}));

		return {
			id: companyId,
			name: companyLookup[companyId] || "Unknown Company",
			email: "",
			domain: undefined,
			ticketCount: orgTickets.length,
			openTickets: openTicketsList.length,
			avgCsat: avgCsat ?? undefined,
			openTicketPriority: priorityCounts,
			tickets: filteredTickets,
		};
	});

	return output;
}

// OAuth functions
export function authorizeZendesk(clientId: string, redirectUri: string, userId: string, subdomain: string): string {
	const state: string = btoa(JSON.stringify({ userId, provider: "zendesk", subdomain }));
	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: `${redirectUri}/oauth/zendesk/callback`,
		response_type: "code",
		scope: "read write",
		state,
	});
	return `https://${subdomain}.zendesk.com/oauth/authorizations/new?${params}`;
}

export async function callbackZendesk(code: string, clientId: string, clientSecret: string, redirectUri: string, subdomain: string): Promise<{ subdomain: string; clientId: string; clientSecret: string }> {
	const tokenResponse: Response = await fetch(
		`https://${subdomain}.zendesk.com/oauth/tokens`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				code,
				client_id: clientId,
				client_secret: clientSecret,
				redirect_uri: `${redirectUri}/oauth/zendesk/callback`,
				grant_type: "authorization_code",
			}),
		},
	);

	if (!tokenResponse.ok) {
		throw new Error(`Zendesk OAuth error: ${tokenResponse.statusText}`);
	}

	return { subdomain, clientId, clientSecret };
}
