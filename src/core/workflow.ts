import type { SvyunAccount } from './account.js';
import type { AccountRunResult, WorkflowResult } from './task.js';

export interface AccountTaskRunner {
  run(account: SvyunAccount): Promise<AccountRunResult>;
}

export async function runAccountsWorkflow(
  accounts: readonly SvyunAccount[],
  runner: AccountTaskRunner,
): Promise<WorkflowResult> {
  const results: AccountRunResult[] = [];

  for (const account of accounts) {
    try {
      results.push(await runner.run(account));
    } catch (error) {
      results.push({
        accountId: account.id,
        accountName: account.displayName,
        usernameMasked: account.usernameMasked,
        success: false,
        stages: [
          {
            name: 'account',
            success: false,
            message: error instanceof Error ? error.message : String(error),
          },
        ],
      });
    }
  }

  return {
    success: results.every((result) => result.success),
    accounts: results,
  };
}
