import type { CRMCompany } from "./crm";
import type { SupportCustomer } from "./support";

export interface CombinedCompany {
	companyName: string;
	CRMData: (CRMCompany & { CRMDataSource: string }) | null;
	supportData: (SupportCustomer & { supportDataSource: string }) | null;
}

function normalizeName(name: string): string {
	if (!name) return "";
	return name
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, "")
		.replace(
			/\b(inc|incorporated|ltd|limited|corp|corporation|co|company|llc|plc)\b/g,
			"",
		)
		.replace(/\s+/g, " ")
		.trim();
}

export function combineData(
	crmData: CRMCompany[] | null,
	supportData: SupportCustomer[],
	crmSource: string,
	supportSource: string,
): CombinedCompany[] {
	// Create lookups
	const crmLookup = new Map<string, CRMCompany>();
	const supportLookup = new Map<string, SupportCustomer>();

	if (crmData) {
		crmData.forEach((company: CRMCompany): void => {
			const key: string = normalizeName(company.companyName);
			if (key) crmLookup.set(key, company);
		});
	}

	supportData.forEach((customer: SupportCustomer): void => {
		const key: string = normalizeName(customer.name);
		if (key) supportLookup.set(key, customer);
	});

	// Get all unique company names
	const allNames = new Set([
		...supportData.map((s: SupportCustomer): string => s.name),
		...(crmData || []).map((c: CRMCompany): string => c.companyName),
	]);

	const unifiedCompanies: CombinedCompany[] = [];

	allNames.forEach((companyName: string): void => {
		const normalized: string = normalizeName(companyName);
		const crmCompany: CRMCompany | undefined = crmLookup.get(normalized);
		const supportCompany: SupportCustomer | undefined = supportLookup.get(normalized);

		unifiedCompanies.push({
			companyName,
			CRMData: crmCompany ? { CRMDataSource: crmSource, ...crmCompany } : null,
			supportData: supportCompany
				? { supportDataSource: supportSource, ...supportCompany }
				: null,
		});
	});

	return unifiedCompanies;
}
