import { z } from "zod";

// Validation schemas for standardized data formats
// These ensure runtime validation of data from all platforms

export const StandardizedCRMCompanySchema = z.object({
	// Core company info (all platforms)
	companyName: z.string().min(1),
	companyId: z.string().min(1),

	// Owner/relationship management (HubSpot, Salesforce)
	ownerId: z.string().optional(),
	ownerAssignedDate: z.string().optional(),

	// Lifecycle/revenue data (HubSpot, Salesforce)
	lifecycleStage: z.string().optional(),
	totalRevenue: z.number().optional(),
	lastActivityDate: z.string().optional(),

	// Deal/opportunity data (HubSpot, Salesforce)
	numberOfOpenDeals: z.number().optional(),
	recentDealAmount: z.number().optional(),
	recentDealCloseDate: z.string().optional(),
	openOpportunities: z.array(z.object({
		id: z.string(),
		name: z.string().optional(),
		amount: z.number().optional(),
		stage: z.string().optional(),
		probability: z.number().optional(),
		ageDays: z.number().optional(),
	})).optional(),

	// Support/case data (Salesforce)
	openCases: z.array(z.object({
		id: z.string(),
		subject: z.string(),
		priority: z.string(),
		status: z.string(),
		ageHours: z.number(),
	})).optional(),

	// Task data (Salesforce)
	openTasks: z.array(z.object({
		id: z.string(),
		subject: z.string().optional(),
		priority: z.string(),
		dueDate: z.string().optional(),
		ageHours: z.number(),
	})).optional(),

	// Sentiment/rating data (HubSpot, Salesforce)
	csmSentiment: z.string().optional(),
	prospectRating: z.string().optional(),

	// Platform-specific data (preserves unique fields)
	platformSpecificData: z.record(z.any()).optional(),
});

export const StandardizedSupportCustomerSchema = z.object({
	// Core customer info (all platforms)
	id: z.string().min(1),
	name: z.string().min(1),
	email: z.string().optional(),
	domain: z.string().optional(),

	// Ticket metrics (all platforms)
	ticketCount: z.number().min(0),
	openTickets: z.number().min(0),

	// Quality metrics (Zendesk, Freshdesk)
	avgCsat: z.number().optional(),
	healthScore: z.number().optional(),

	// Account management (Freshdesk)
	accountTier: z.string().optional(),
	renewalDate: z.string().optional(),

	// Ticket priority breakdown (Zendesk, Freshdesk)
	openTicketPriorities: z.object({
		low: z.number().min(0),
		medium: z.number().min(0),
		high: z.number().min(0),
		urgent: z.number().min(0),
	}).optional(),

	// Detailed ticket data (all platforms)
	tickets: z.array(z.object({
		id: z.string(),
		subject: z.string().optional(),
		title: z.string().optional(),
		status: z.string(),
		priority: z.string().optional(),
		createdAt: z.string(),
		ageHours: z.number(),
		tags: z.array(z.string()).optional(),
		sentimentScore: z.number().optional(),
	})).optional(),

	// Platform-specific data (preserves unique fields)
	platformSpecificData: z.record(z.any()).optional(),
});

export const StandardizedCombinedCompanySchema = z.object({
	companyName: z.string().min(1),
	CRMData: z.union([
		StandardizedCRMCompanySchema.extend({ CRMDataSource: z.string() }),
		z.null()
	]),
	supportData: z.union([
		StandardizedSupportCustomerSchema.extend({ supportDataSource: z.string() }),
		z.null()
	]),
});

// Validation functions
export function validateCRMCompany(data: unknown) {
	return StandardizedCRMCompanySchema.safeParse(data);
}

export function validateSupportCustomer(data: unknown) {
	return StandardizedSupportCustomerSchema.safeParse(data);
}

export function validateCombinedCompany(data: unknown) {
	return StandardizedCombinedCompanySchema.safeParse(data);
}

// Type exports for validated data
export type ValidatedCRMCompany = z.infer<typeof StandardizedCRMCompanySchema>;
export type ValidatedSupportCustomer = z.infer<typeof StandardizedSupportCustomerSchema>;
export type ValidatedCombinedCompany = z.infer<typeof StandardizedCombinedCompanySchema>;