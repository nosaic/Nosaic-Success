# Standardized Data Formats

This document describes the standardized data schemas implemented across all CRM and support platforms to ensure consistent data structure for AI analysis while preserving platform-specific information.

## Overview

Previously, each platform (HubSpot, Salesforce, Zendesk, Intercom, Freshdesk) returned data in different formats, making it difficult for AI models to consistently analyze patterns across platforms. The standardized schemas solve this by:

1. **Consistent Structure**: All platforms now return data in predictable formats
2. **No Data Loss**: Unique platform-specific data is preserved in `platformSpecificData` objects
3. **Optional Fields**: Fields that aren't supported by all platforms are optional
4. **Type Safety**: Full TypeScript support with runtime validation
5. **Alphanumeric IDs**: All ID fields are treated as strings to handle both numeric and alphanumeric identifiers

## CRM Data Schema

All CRM platforms now return data conforming to `StandardizedCRMCompany`:

```typescript
interface StandardizedCRMCompany {
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
    name?: string;
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
    subject?: string;
    priority: string;
    dueDate?: string;
    ageHours: number;
  }>;

  // Sentiment/rating data (HubSpot, Salesforce)
  csmSentiment?: string;
  prospectRating?: string;

  // Platform-specific data (preserves unique fields)
  platformSpecificData?: Record<string, any>;
}
```

### Platform Mappings

#### HubSpot
- `companyName` ← `properties.name`
- `companyId` ← `id`
- `lifecycleStage` ← `properties.lifecyclestage`
- `totalRevenue` ← `properties.total_revenue`
- `csmSentiment` ← `properties.hs_csm_sentiment`
- `platformSpecificData` ← `companyCloseDate`, `lastUpdated`, `lastContacted`

#### Salesforce
- `companyName` ← `accountName`
- `companyId` ← `accountId`
- `lastActivityDate` ← `lastActivityDate`
- `prospectRating` ← `prospectRating`
- `openCases` ← `openCases` array
- `openOpportunities` ← `openOpportunities` array
- `openTasks` ← `openTasks` array
- `platformSpecificData` ← `accountType`

## Support Data Schema

All support platforms now return data conforming to `StandardizedSupportCustomer`:

```typescript
interface StandardizedSupportCustomer {
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

  // Platform-specific data (preserves unique fields)
  platformSpecificData?: Record<string, any>;
}
```

### Platform Mappings

#### Zendesk
- `id` ← `companyId`
- `name` ← `companyLookup[companyId]` or `"Unknown Company"`
- `ticketCount` ← `orgTickets.length`
- `openTickets` ← `openTicketsList.length`
- `avgCsat` ← calculated from `solvedTicketsList`
- `openTicketPriorities` ← priority count object (mapped `normal` → `medium`)
- `tickets` ← filtered ticket array

#### Intercom
- `id` ← `companyId`
- `name` ← `companyMap[companyId]` or `"Unknown Company"`
- `ticketCount` ← `tickets.length`
- `openTickets` ← `openTicketCount`
- `tickets` ← ticket array with standardized fields

#### Freshdesk
- `id` ← `companyId`
- `name` ← `details.companyName` or `"Unknown Company"`
- `ticketCount` ← `tickets.length`
- `openTickets` ← `openTicketsCount`
- `healthScore` ← `details.healthScore`
- `accountTier` ← `details.accountTier`
- `renewalDate` ← `details.renewalDate`
- `openTicketPriorities` ← priority count object
- `tickets` ← ticket array with standardized fields

## Combined Data Schema

The final combined data structure used by AI analysis:

```typescript
interface StandardizedCombinedCompany {
  companyName: string;
  CRMData: (StandardizedCRMCompany & { CRMDataSource: string }) | null;
  supportData: (StandardizedSupportCustomer & { supportDataSource: string }) | null;
}
```

## Data Flow

1. **Platform APIs** → Raw platform-specific data
2. **Transformation Functions** → Standardized format per platform
3. **Data Combiner** → Merged company data with normalization
4. **AI Analysis** → Consistent data structure for pattern recognition

## Validation

Runtime validation is provided via Zod schemas in `validation.ts`:

- `validateCRMCompany()` - Validates CRM data
- `validateSupportCustomer()` - Validates support data
- `validateCombinedCompany()` - Validates combined data

## Testing

Comprehensive tests are available in:
- `src/__tests__/transformation-tests.ts` - Unit tests for transformations
- `src/__tests__/integration-tests.ts` - End-to-end integration tests

Run tests with: `npm run test` (if configured) or `npx tsx src/__tests__/*.ts`

## Benefits

1. **Consistent AI Analysis**: AI models receive predictable data structures
2. **Cross-Platform Insights**: Easy to compare metrics across platforms
3. **Future-Proof**: New platforms can easily adopt the standardized schema
4. **Data Preservation**: No loss of platform-specific valuable data
5. **Type Safety**: Full TypeScript support with runtime validation
