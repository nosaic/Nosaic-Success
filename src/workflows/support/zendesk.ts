import { SupportCustomer } from "./index";

interface ZendeskConfig {
	subdomain: string;
	clientId: string;
	clientSecret: string;
}

async function getAccessToken(config: ZendeskConfig): Promise<string> {
	const response = await fetch(
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

	const data = await response.json();
	return data.access_token;
}

export async function fetchZendesk(
	configJson: string,
): Promise<SupportCustomer[]> {
	const config: ZendeskConfig = JSON.parse(configJson);
	const accessToken = await getAccessToken(config);

	const ticketsRes = await fetch(
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

	const ticketsData = await ticketsRes.json();
	const tickets = ticketsData.tickets;

	function csatScore(ticket: any): number | null {
		const score = ticket.satisfaction_rating?.score;
		return !score || score === "unoffered" ? null : score === "good" ? 1 : 0;
	}

	const grouped: any = {};
	tickets.forEach((ticket: any) => {
		const orgId = ticket.organization_id || "unknown_company";
		if (!grouped[orgId]) grouped[orgId] = [];
		grouped[orgId].push(ticket);
	});

	const orgsRes = await fetch(
		`https://${config.subdomain}.zendesk.com/api/v2/organizations.json`,
		{ headers: { Authorization: `Bearer ${accessToken}` } },
	);
	const orgsData = await orgsRes.json();

	const companyLookup: any = {};
	orgsData.organizations.forEach((org: any) => {
		companyLookup[org.id] = org.name;
	});

	const output = Object.entries(grouped).map(([companyId, orgTickets]: any) => {
		const openTicketsList = orgTickets.filter(
			(t: any) => t.status === "open" || t.status === "pending",
		);
		const solvedTicketsList = orgTickets.filter(
			(t: any) => t.status === "solved",
		);

		const priorityCounts = { low: 0, normal: 0, high: 0, urgent: 0 };
		openTicketsList.forEach((t: any) => {
			const priority = t.priority || "normal";
			if (priorityCounts[priority as keyof typeof priorityCounts] != null) {
				priorityCounts[priority as keyof typeof priorityCounts]++;
			}
		});

		const csatScores = solvedTicketsList
			.map(csatScore)
			.filter((s: any) => s != null);
		const avgCsat =
			csatScores.length > 0
				? csatScores.reduce((a, b) => a + b, 0) / csatScores.length
				: null;

		const filteredTickets = openTicketsList.map((t: any) => ({
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
			avgCsat,
			openTicketPriority: priorityCounts,
			tickets: filteredTickets,
		};
	});

	return output;
}
