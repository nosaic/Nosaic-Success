import type { CRMCompany } from "./index";

interface HubSpotConfig {
	clientId: string;
	clientSecret: string;
}

async function getAccessToken(config: HubSpotConfig): Promise<string> {
	const response: Response = await fetch("https://api.hubapi.com/oauth/v1/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "client_credentials",
			client_id: config.clientId,
			client_secret: config.clientSecret,
		}),
	});

	if (!response.ok)
		throw new Error(`HubSpot token error: ${response.statusText}`);

	const data = await response.json() as { access_token: string };
	return data.access_token;
}

export async function fetchHubSpot(
	clientId: string,
	clientSecret: string,
): Promise<CRMCompany[]> {
	const config: HubSpotConfig = { clientId, clientSecret };
	const accessToken: string = await getAccessToken(config);

	const properties: string[] = [
		"name",
		"hubspot_owner_id",
		"lifecyclestage",
		"total_revenue",
		"hs_csm_sentiment",
		"notes_last_contacted",
		"closedate",
		"notes_last_updated",
		"num_associated_deals",
		"hubspot_owner_assigneddate",
		"hs_num_open_deals",
		"recent_deal_close_date",
		"recent_deal_amount",
	];

	const response: Response = await fetch(
		`https://api.hubapi.com/crm/v3/objects/companies?properties=${properties.join(",")}`,
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
		},
	);

	if (!response.ok)
		throw new Error(`HubSpot API error: ${response.statusText}`);

	const data = await response.json() as { results: any[] };

	function getDateFromUnixTime(unixTime: string | null): string | null {
		if (!unixTime) return null;
		return new Date(Number(unixTime)).toISOString();
	}

	return data.results.map((company: any) => ({
		companyName: company.properties?.name || null,
		companyId: company.id || null,
		ownerId: company.properties?.hubspot_owner_id || null,
		ownerAssignedDate: getDateFromUnixTime(
			company.properties?.hubspot_owner_assigneddate || null,
		),
		lifecycleStage: company.properties?.lifecyclestage || null,
		companyCloseDate: getDateFromUnixTime(
			company.properties?.closedate || null,
		),
		lastUpdated: getDateFromUnixTime(
			company.properties?.notes_last_updated || null,
		),
		lastContacted: getDateFromUnixTime(
			company.properties?.notes_last_contacted || null,
		),
		numberOfOpenDeals: Number(company.properties?.hs_num_open_deals || 0),
		recentDealCloseDate: getDateFromUnixTime(
			company.properties?.recent_deal_close_date || null,
		),
		recentDealAmount: Number(company.properties?.recent_deal_amount || 0),
		totalRevenue: Number(company.properties?.total_revenue || 0),
		CSMSentiment: company.properties?.hs_csm_sentiment || null,
	}));
}

// OAuth functions
export function authorizeHubSpot(clientId: string, redirectUri: string, userId: string): string {
	const state: string = btoa(JSON.stringify({ userId, provider: "hubspot" }));
	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: `${redirectUri}/oauth/hubspot/callback`,
		scope: "crm.objects.companies.read",
		state,
	});
	return `https://app.hubspot.com/oauth/authorize?${params}`;
}

export async function callbackHubSpot(code: string, clientId: string, clientSecret: string, redirectUri: string):
    Promise<{ clientId: string; clientSecret: string }> {
	const tokenResponse: Response = await fetch("https://api.hubapi.com/oauth/v1/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			code,
			client_id: clientId,
			client_secret: clientSecret,
			redirect_uri: `${redirectUri}/oauth/hubspot/callback`,
			grant_type: "authorization_code",
		}),
	});

	if (!tokenResponse.ok) {
		throw new Error(`HubSpot OAuth error: ${tokenResponse.statusText}`);
	}

	return { clientId, clientSecret };
}
