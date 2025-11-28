# Agent Guidelines for Nosaic Success API

## Build/Test Commands
- **Build all packages**: `npm run build`
- **Type check all packages**: `npm run typecheck`
- **Build core package**: `npm run buildCore`
- **Build cloudflare package**: `npm run buildCloudflare`
- **Deploy cloudflare**: `npm run deployCloud`
- **Run transformation tests**: `node packages/core/src/__tests__/transformation-tests.ts`
- **Run integration tests**: `node packages/core/src/__tests__/integration-tests.ts`

## Code Style Guidelines

### TypeScript Configuration
- Target: ES2022
- Strict mode enabled
- Explicit type annotations required
- No unchecked indexed access
- Verbatim module syntax

### Imports
- Group imports: standard library → third-party → local modules
- Use explicit import statements
- Prefer named imports over default imports

### Naming Conventions
- **Functions**: camelCase (e.g., `hashPassword`, `verifyToken`)
- **Types/Interfaces**: PascalCase (e.g., `StandardizedCRMCompany`, `JWTPayload`)
- **Variables**: camelCase with descriptive names
- **Constants**: UPPER_SNAKE_CASE where appropriate
- **Files**: kebab-case for directories, camelCase for files

### Error Handling
- Use try/catch blocks for async operations
- Return boolean false or throw descriptive errors
- Avoid silent failures - log or return error states

### Code Structure
- Pure functions preferred where possible
- Explicit return types on all exported functions
- Use JSDoc comments only for public API functions
- Avoid implementation comments - code should be self-documenting

### Testing
- Use console.assert for simple assertions
- Test functions named with `test` prefix
- Mock data structures match real API responses
- Run tests in Node.js environment check

### Formatting
- Follow Prettier defaults (configured in IDE)
- Consistent indentation and spacing
- Line length appropriate for readability</content>
<parameter name="filePath">~/Workspace/Nosaic-Success/Nosaic-Success-API/AGENTS.md

## Core Architectural Choices
1. Monorepo Structure with Workspaces
   - Uses npm workspaces to manage two packages: core (business logic) and cloudflare (API layer)
   - Enables shared TypeScript compilation and dependency management
   - Clear separation between platform-agnostic business logic and deployment-specific code
2. Serverless Deployment on Cloudflare
   - Cloudflare Workers for serverless compute (edge deployment, global CDN)
   - Cloudflare D1 for SQLite-based relational database
   - Cloudflare KV for key-value storage
   - Cloudflare Workflows for durable execution of long-running tasks
3. Data Standardization Pattern
   - Platform-specific data is normalized into standardized schemas
   - Enables consistent AI processing regardless of source platform
   - Preserves platform-specific fields in platformSpecificData objects

## Technology Stack

### Core Technologies
   - TypeScript ES2022 - Strict typing, modern JavaScript features
   - Hono - Lightweight web framework optimized for Cloudflare Workers
   - Zod - Runtime type validation (used in data transformation)
   - Noble Hashes - Cryptographic operations (Argon2id, AES-256-GCM)
   - Jose - JWT token handling
     External Integrations
   - OpenRouter API - AI report generation (Claude 3.5 Sonnet)
   - Resend - Email delivery for reports
   - CRM Platforms: HubSpot, Salesforce
   - Support Platforms: Zendesk, Intercom, Freshdesk
     Development Tools
   - Wrangler - Cloudflare deployment CLI
   - Prettier - Code formatting (IDE-configured)
   - Console.assert - Simple test assertions

## Data Flow Architecture
1. Data Ingestion Layer
   CRM APIs → Provider Classes → StandardizedCRMCompany[]
   Support APIs → Provider Classes → StandardizedSupportCustomer[]
2. Data Processing Pipeline
   Raw API Data → Transformation → Standardized Schemas → Data Combiner → Unified Company Objects
3. AI Processing Layer
   StandardizedCombinedCompany[] → OpenRouter API → Markdown Churn Report
4. Delivery Layer
   Report → Email/Slack → User Dashboard

## Key Design Patterns

### Provider Pattern
- Each platform (HubSpot, Salesforce, Zendesk, etc.) has its own provider class
- Consistent interface: fetchCompanies() / fetchCustomers()
- Encapsulates platform-specific API logic and authentication

### Workflow Pattern
- Uses Cloudflare Workflows for reliable, resumable execution
- Steps: Fetch CRM → Fetch Support → Combine → Generate AI Report → Deliver → Log
- Automatic retries on failures, durable state management

### Standardization Pattern
- All platform data normalized to common schemas
- Fuzzy name matching for company deduplication
- Preserves unique platform features while enabling cross-platform analysis

### Security Pattern
- Encrypted credential storage in database
- JWT-based authentication
- Environment-based secrets management

## Database Schema (D1 SQLite)

### Core Tables
- users - User accounts
- workflow_configs - Report configuration per user
- oauth_connections - OAuth tokens for integrations
- reports - Generated report history

## Deployment Architecture

### Edge Computing
- Global deployment via Cloudflare's edge network
- Scheduled workflows run on cron-like triggers
- API routes handle real-time requests

### Scalability Considerations
- Serverless scaling (no server management)
- Durable workflows handle long-running tasks
- Database queries optimized for D1

### Reliability Features
- Workflow auto-retries on failures
- Transactional database operations
- Comprehensive error logging
