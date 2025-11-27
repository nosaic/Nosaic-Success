import type { StandardizedCRMCompany } from "../standardized-schemas";

interface SalesforceConfig {
	instanceUrl: string;
	clientId: string;
	clientSecret: string;
}

async function getAccessToken(config: SalesforceConfig): Promise<string> {
	const response: Response = await fetch(`${config.instanceUrl}/services/oauth2/token`, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "client_credentials",
			client_id: config.clientId,
			client_secret: config.clientSecret,
		}),
	});

	if (!response.ok)
		throw new Error(`Salesforce token error: ${response.statusText}`);

	const data = await response.json() as { access_token: string };
	return data.access_token;
}

export async function fetchSalesforce(
	instanceUrl: string,
	clientId: string,
	clientSecret: string,
): Promise<StandardizedCRMCompany[]> {
	const config: SalesforceConfig = { instanceUrl, clientId, clientSecret };
	const accessToken: string = await getAccessToken(config);

	// Fetch Accounts
	const accountsQuery = "SELECT Id, Name, Type, LastActivityDate, Rating FROM Account";
	const accountsRes: Response = await fetch(
		`${config.instanceUrl}/services/data/v65.0/query?q=${encodeURIComponent(accountsQuery)}`,
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
		},
	);

	if (!accountsRes.ok)
		throw new Error(`Salesforce Accounts API error: ${accountsRes.statusText}`);
	const accountsData = await accountsRes.json() as { records: any[] };

	const accounts = accountsData.records.map((acc: any) => ({
		accountName: acc.Name || null,
		accountId: String(acc.Id || ""),
		accountType: acc.Type || null,
		lastActivityDate: acc.LastActivityDate || null,
		prospectRating: acc.Rating || null,
		openCases: [],
		openOpportunities: [],
		openTasks: [],
	}));

	// Fetch Cases
	const casesQuery =
		"SELECT Id, AccountId, Subject, Description, CreatedDate, LastModifiedDate, Type, Priority, Status, Reason, IsEscalated, IsClosed, IsDeleted FROM Case";
	const casesRes: Response = await fetch(
		`${config.instanceUrl}/services/data/v65.0/query?q=${encodeURIComponent(casesQuery)}`,
		{ headers: { Authorization: `Bearer ${accessToken}` } },
	);
	const casesData = await casesRes.json() as { records: any[] };

	const casesMap = new Map();
	casesData.records.forEach((c: any): void => {
		if (!c.IsClosed && !c.IsDeleted) {
			if (!casesMap.has(c.AccountId)) casesMap.set(c.AccountId, []);
			casesMap.get(c.AccountId).push({
				caseSubject: c.Subject,
				caseId: String(c.Id),
				caseType: c.Type,
				caseStatus: c.Status,
				casePriority: c.Priority,
				caseCreatedAt: c.CreatedDate,
				caseAgeHours: Math.round(
					(Date.now() - new Date(c.CreatedDate).getTime()) / (1000 * 60 * 60),
				),
				isCaseEscalated: c.IsEscalated,
				caseReason: c.Reason,
			});
		}
	});

	// Fetch Opportunities
	const oppQuery =
		"SELECT Id, AccountId, Name, Amount, Type, StageName, Probability, CreatedDate, CloseDate, IsClosed, IsDeleted FROM Opportunity";
	const oppRes: Response = await fetch(
		`${config.instanceUrl}/services/data/v65.0/query?q=${encodeURIComponent(oppQuery)}`,
		{ headers: { Authorization: `Bearer ${accessToken}` } },
	);
	const oppData = await oppRes.json() as { records: any[] };

	const oppMap = new Map();
	oppData.records.forEach((o: any): void => {
		if (!o.IsClosed && !o.IsDeleted) {
			if (!oppMap.has(o.AccountId)) oppMap.set(o.AccountId, []);
			oppMap.get(o.AccountId).push({
				opportunityId: String(o.Id),
				name: o.Name,
				amount: o.Amount,
				type: o.Type,
				stage: o.StageName,
				probability: o.Probability,
				createdDate: o.CreatedDate,
				closeByDate: o.CloseDate,
				opportunityAgeDays: Math.round(
					(Date.now() - new Date(o.CreatedDate).getTime()) /
						(1000 * 60 * 60 * 24),
				),
			});
		}
	});

	// Fetch Tasks
	const taskQuery =
		"SELECT Id, AccountId, Subject, Description, Status, Priority, CreatedDate, ActivityDate, IsClosed, IsArchived FROM Task";
	const taskRes: Response = await fetch(
		`${config.instanceUrl}/services/data/v65.0/query?q=${encodeURIComponent(taskQuery)}`,
		{ headers: { Authorization: `Bearer ${accessToken}` } },
	);
	const taskData = await taskRes.json() as { records: any[] };

	const taskMap = new Map();
	taskData.records.forEach((t: any): void => {
		if (!t.IsClosed && !t.IsArchived) {
			if (!taskMap.has(t.AccountId)) taskMap.set(t.AccountId, []);
			taskMap.get(t.AccountId).push({
				subject: t.Subject || null,
				description: t.Description || null,
				taskId: String(t.Id),
				status: t.Status,
				priority: t.Priority,
				createdDate: t.CreatedDate,
				taskAgeHours: Math.round(
					(Date.now() - new Date(t.CreatedDate).getTime()) / (1000 * 60 * 60),
				),
				dueDate: t.ActivityDate,
			});
		}
	});

	// Combine all data
	return accounts.map((acc: any): StandardizedCRMCompany => ({
		companyName: acc.accountName || "",
		companyId: String(acc.accountId || ""),
		lastActivityDate: acc.lastActivityDate || undefined,
		prospectRating: acc.prospectRating || undefined,
		openCases: casesMap.get(acc.accountId) || undefined,
		openOpportunities: oppMap.get(acc.accountId) || undefined,
		openTasks: taskMap.get(acc.accountId) || undefined,
		platformSpecificData: {
			accountType: acc.accountType,
		},
	}));
}

// OAuth functions
export function authorizeSalesforce(clientId: string, redirectUri: string, userId: string): string {
	const state: string = btoa(JSON.stringify({ userId, provider: "salesforce" }));
	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: `${redirectUri}/oauth/salesforce/callback`,
		response_type: "code",
		state,
	});
	return `https://login.salesforce.com/services/oauth2/authorize?${params}`;
}

export async function callbackSalesforce(code: string, clientId: string, clientSecret: string, redirectUri: string):
    Promise<{ instanceUrl: string; clientId: string; clientSecret: string }> {
	const tokenResponse: Response = await fetch(
		"https://login.salesforce.com/services/oauth2/token",
		{
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				code,
				client_id: clientId,
				client_secret: clientSecret,
				redirect_uri: `${redirectUri}/oauth/salesforce/callback`,
				grant_type: "authorization_code",
			}),
		},
	);

	if (!tokenResponse.ok) {
		throw new Error(`Salesforce OAuth error: ${tokenResponse.statusText}`);
	}

	const tokens = await tokenResponse.json() as { instance_url: string };
	return { instanceUrl: tokens.instance_url, clientId, clientSecret };
}
