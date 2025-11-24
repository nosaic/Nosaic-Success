import { CRMCompany } from "./index";

interface SalesforceConfig {
	instanceUrl: string;
	clientId: string;
	clientSecret: string;
}

async function getAccessToken(config: SalesforceConfig): Promise<string> {
	const response = await fetch(`${config.instanceUrl}/services/oauth2/token`, {
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

	const data = await response.json();
	return data.access_token;
}

export async function fetchSalesforce(
	configJson: string,
	env: Env,
): Promise<CRMCompany[]> {
	const config: SalesforceConfig = JSON.parse(configJson);
	const accessToken = await getAccessToken(config);

	// Fetch Accounts
	const accountsQuery =
		"SELECT Id, Name, Type, LastActivityDate, Rating FROM Account";
	const accountsRes = await fetch(
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
	const accountsData = await accountsRes.json();

	const accounts = accountsData.records.map((acc: any) => ({
		accountName: acc.Name || null,
		accountId: acc.Id || null,
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
	const casesRes = await fetch(
		`${config.instanceUrl}/services/data/v65.0/query?q=${encodeURIComponent(casesQuery)}`,
		{ headers: { Authorization: `Bearer ${accessToken}` } },
	);
	const casesData = await casesRes.json();

	const casesMap = new Map();
	casesData.records.forEach((c: any) => {
		if (!c.IsClosed && !c.IsDeleted) {
			if (!casesMap.has(c.AccountId)) casesMap.set(c.AccountId, []);
			casesMap.get(c.AccountId).push({
				caseSubject: c.Subject,
				caseId: c.Id,
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
	const oppRes = await fetch(
		`${config.instanceUrl}/services/data/v65.0/query?q=${encodeURIComponent(oppQuery)}`,
		{ headers: { Authorization: `Bearer ${accessToken}` } },
	);
	const oppData = await oppRes.json();

	const oppMap = new Map();
	oppData.records.forEach((o: any) => {
		if (!o.IsClosed && !o.IsDeleted) {
			if (!oppMap.has(o.AccountId)) oppMap.set(o.AccountId, []);
			oppMap.get(o.AccountId).push({
				opportunityId: o.Id,
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
	const taskRes = await fetch(
		`${config.instanceUrl}/services/data/v65.0/query?q=${encodeURIComponent(taskQuery)}`,
		{ headers: { Authorization: `Bearer ${accessToken}` } },
	);
	const taskData = await taskRes.json();

	const taskMap = new Map();
	taskData.records.forEach((t: any) => {
		if (!t.IsClosed && !t.IsArchived) {
			if (!taskMap.has(t.AccountId)) taskMap.set(t.AccountId, []);
			taskMap.get(t.AccountId).push({
				subject: t.Subject || null,
				description: t.Description || null,
				taskId: t.Id,
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
	return accounts.map((acc: any) => ({
		...acc,
		openCases: casesMap.get(acc.accountId) || null,
		openOpportunities: oppMap.get(acc.accountId) || null,
		openTasks: taskMap.get(acc.accountId) || null,
	}));
}
