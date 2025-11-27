// Standardized data schemas for consistent data formats across all platforms
// This ensures consistent data structure for AI processing while preserving platform-specific data

export interface StandardizedCRMCompany {
  // Core company info (all platforms)
  companyName: string;
  companyId: string;

  // Owner/relationship management (HubSpot, Salesforce)
  ownerId?: string;
  ownerAssignedDate?: string;

  // Lifecycle/revenue data (HubSpot, Salesforce)
  lifecycleStage?: string;
  totalRevenue?: number;
  lastActivityDate?: string;

  // Deal/opportunity data (HubSpot, Salesforce)
  numberOfOpenDeals?: number;
  recentDealAmount?: number;
  recentDealCloseDate?: string;
  openOpportunities?: Array<{
    id: string;
    name: string;
    amount?: number;
    stage?: string;
    probability?: number;
    ageDays?: number;
  }>;

  // Support/case data (Salesforce)
  openCases?: Array<{
    id: string;
    subject: string;
    priority: string;
    status: string;
    ageHours: number;
  }>;

  // Task data (Salesforce)
  openTasks?: Array<{
    id: string;
    subject: string;
    priority: string;
    dueDate?: string;
    ageHours: number;
  }>;

  // Sentiment/rating data (HubSpot, Salesforce)
  csmSentiment?: string;
  prospectRating?: string;

  // Platform-specific data (preserves unique fields not covered above)
  platformSpecificData?: Record<string, any>;
}

export interface StandardizedSupportCustomer {
  // Core customer info (all platforms)
  id: string;
  name: string;
  email?: string;
  domain?: string;

  // Ticket metrics (all platforms)
  ticketCount: number;
  openTickets: number;

  // Quality metrics (Zendesk, Freshdesk)
  avgCsat?: number;
  healthScore?: number;

  // Account management (Freshdesk)
  accountTier?: string;
  renewalDate?: string;

  // Ticket priority breakdown (Zendesk, Freshdesk)
  openTicketPriorities?: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };

  // Detailed ticket data (all platforms)
  tickets?: Array<{
    id: string;
    subject?: string;
    title?: string;
    status: string;
    priority?: string;
    createdAt: string;
    ageHours: number;
    tags?: string[];
    sentimentScore?: number;
  }>;

  // Platform-specific data (preserves unique fields not covered above)
  platformSpecificData?: Record<string, any>;
}

// Combined company data using standardized schemas
export interface StandardizedCombinedCompany {
  companyName: string;
  CRMData: (StandardizedCRMCompany & { CRMDataSource: string }) | null;
  supportData: (StandardizedSupportCustomer & { supportDataSource: string }) | null;
}