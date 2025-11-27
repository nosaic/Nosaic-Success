import type { StandardizedCRMCompany } from "./standardized-schemas";
import type { StandardizedSupportCustomer } from "./standardized-schemas";
import type { StandardizedCombinedCompany } from "./standardized-schemas";

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
	crmData: StandardizedCRMCompany[] | null,
	supportData: StandardizedSupportCustomer[],
	crmSource: string,
	supportSource: string,
): StandardizedCombinedCompany[] {
	// Create lookups
	const crmLookup = new Map<string, StandardizedCRMCompany>();
	const supportLookup = new Map<string, StandardizedSupportCustomer>();

	if (crmData) {
		crmData.forEach((company: StandardizedCRMCompany): void => {
			const key: string = normalizeName(company.companyName);
			if (key) crmLookup.set(key, company);
		});
	}

	supportData.forEach((customer: StandardizedSupportCustomer): void => {
		const key: string = normalizeName(customer.name);
		if (key) supportLookup.set(key, customer);
	});

	// Get all unique company names
	const allNames = new Set([
		...supportData.map((s: StandardizedSupportCustomer): string => s.name),
		...(crmData || []).map((c: StandardizedCRMCompany): string => c.companyName),
	]);

	const unifiedCompanies: StandardizedCombinedCompany[] = [];

	allNames.forEach((companyName: string): void => {
		const normalized: string = normalizeName(companyName);
		const crmCompany: StandardizedCRMCompany | undefined = crmLookup.get(normalized);
		const supportCompany: StandardizedSupportCustomer | undefined = supportLookup.get(normalized);

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
