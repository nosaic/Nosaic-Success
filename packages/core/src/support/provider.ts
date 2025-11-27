import type { StandardizedSupportCustomer } from "../standardized-schemas";

export abstract class SupportProvider {
  abstract fetchCustomers(): Promise<StandardizedSupportCustomer[]>;
  abstract authorize(clientId: string, redirectUri: string, userId: string, subdomain?: string): string;
  abstract callback(code: string, clientId: string, clientSecret: string, redirectUri: string, subdomain?: string): Promise<any>;
}