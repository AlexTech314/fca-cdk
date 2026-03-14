export interface BatchItem {
  lead_id: string;
}

export interface ContactResult {
  email: string;
  first_name: string | null;
  last_name: string | null;
  contact_type: 'owner' | 'team' | 'business';
}

export interface LlmToolOutput {
  contacts: ContactResult[];
}
