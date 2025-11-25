// Core business logic exports
export { fetchCRM, type CRMCompany } from "./crm/index";
export { fetchSupport, type SupportCustomer } from "./support/index";
export { combineData, type CombinedCompany } from "./combiner";
export { generateChurnReport } from "./ai-report";

// OAuth exports
export { authorizeHubSpot, callbackHubSpot } from "./crm/hubspot";
export { authorizeSalesforce, callbackSalesforce } from "./crm/salesforce";
export { authorizeZendesk, callbackZendesk } from "./support/zendesk";
export { authorizeIntercom, callbackIntercom } from "./support/intercom";
export { authorizeFreshdesk, callbackFreshdesk } from "./support/freshdesk";

// Utility exports
export {
	hashPassword,
	verifyPassword,
	encrypt,
	decrypt,
	generateId,
	generateToken,
} from "./utils/crypto";

export { signAccessToken, verifyToken } from "./utils/jwt";
export { sendEmail } from "./utils/email";
export { sendSlack } from "./utils/slack";