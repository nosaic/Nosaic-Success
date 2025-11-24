import type { SupportCustomer } from "./index";

interface IntercomConfig {
	clientId: string;
	clientSecret: string;
}

async function getAccessToken(config: IntercomConfig): Promise<string> {
	const response = await fetch("https://api.intercom.io/auth/eagle/token", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			client_id: config.clientId,
			client_secret: config.clientSecret,
		}),
	});

	if (!response.ok)
		throw new Error(`Intercom token error: ${response.statusText}`);

	const data = await response.json();
	return data.token;
}

export async function fetchIntercom(
	configJson: string,
): Promise<SupportCustomer[]> {
	const config: IntercomConfig = JSON.parse(configJson);
	const accessToken = await getAccessToken(config);

	const ticketsRes = await fetch("https://api.intercom.io/tickets/search", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
			"Intercom-Version": "2.14",
		},
		body: JSON.stringify({
			query: {
				operator: "AND",
				value: [
					{
						field: "created_at",
						operator: ">",
						value: "1306054154",
					},
				],
			},
			pagination: { per_page: 150 },
		}),
	});

	if (!ticketsRes.ok)
		throw new Error(`Intercom API error: ${ticketsRes.statusText}`);

	const ticketsData = await ticketsRes.json();
	const tickets = ticketsData.tickets;

	const grouped: any = {};
	tickets.forEach((ticket: any) => {
		if (ticket.open) {
			const companyId = ticket.company_id || "unknown_company";

			if (!grouped[companyId]) {
				grouped[companyId] = {
					companyId,
					openTicketCount: 0,
					tickets: [],
				};
			}

			grouped[companyId].tickets.push({
				ticketTitle: ticket.ticket_attributes?._default_title_,
				ticketId: ticket.id,
				ticketState: ticket.ticket_state?.category || null,
				ticketCreatedAt: Number(ticket.created_at),
				ticketUpdatedAt: Number(ticket.updated_at),
				ticketAgeHours: Math.round(
					(Date.now() - new Date(Number(ticket.created_at) * 1000).getTime()) /
						(1000 * 60 * 60),
				),
			});

			grouped[companyId].openTicketCount++;
		}
	});

	const companiesRes = await fetch("https://api.intercom.io/companies", {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Intercom-Version": "2.14",
		},
	});
	const companiesData = await companiesRes.json();

	const companyMap: any = {};
	if (Array.isArray(companiesData.data)) {
		companiesData.data.forEach((company: any) => {
			companyMap[company.id] = company.name || "Unknown Company";
		});
	}

	return Object.values(grouped).map((company: any) => ({
		id: company.companyId,
		name: companyMap[company.companyId] || "Unknown Company",
		email: "",
		domain: undefined,
		ticketCount: company.tickets.length,
		openTickets: company.openTicketCount,
		tickets: company.tickets,
	}));
}
