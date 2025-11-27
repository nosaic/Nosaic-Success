import type { StandardizedCRMCompany } from "../standardized-schemas";

export abstract class CRMProvider {
  abstract fetchCompanies(): Promise<StandardizedCRMCompany[]>;
  abstract authorize(clientId: string, redirectUri: string, userId: string): string;
  abstract callback(code: string, clientId: string, clientSecret: string, redirectUri: string): Promise<any>;
}