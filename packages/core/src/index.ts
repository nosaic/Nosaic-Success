// Core business logic exports
export { fetchCRM } from "./crm/index";
export { fetchSupport } from "./support/index";
export { combineData } from "./combiner";
export type { StandardizedCRMCompany, StandardizedSupportCustomer, StandardizedCombinedCompany } from "./standardized-schemas";
export { generateChurnReport } from "./ai-report";

// Class exports
export { HubSpotCRM } from "./crm/hubspot";
export { SalesforceCRM } from "./crm/salesforce";
export { ZendeskSupport } from "./support/zendesk";
export { IntercomSupport } from "./support/intercom";
export { FreshdeskSupport } from "./support/freshdesk";

// Utility exports
export {
	hashPassword,
	verifyPassword,
	encrypt,
	decrypt,
	generateId,
	generateToken,
} from "./utils/crypto";


export { sendEmail } from "./utils/email";
export { sendSlack } from "./utils/slack";
