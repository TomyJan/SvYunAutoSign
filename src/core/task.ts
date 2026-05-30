export type StageName = string;

export interface StageResult {
  name: StageName;
  success: boolean;
  message: string;
  skipped?: boolean;
  details?: Record<string, unknown>;
}

export interface AccountRunResult {
  accountId: string;
  accountName: string;
  usernameMasked: string;
  success: boolean;
  stages: StageResult[];
}

export interface WorkflowResult {
  success: boolean;
  accounts: AccountRunResult[];
}
