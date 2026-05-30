import type { SvyunAccount } from '../../core/account.js';
import type { AccountRunResult, StageResult } from '../../core/task.js';
import type { AccountTaskRunner } from '../../core/workflow.js';
import type { SvyunClientLike } from './apiTypes.js';

export class SvyunAccountTaskRunner implements AccountTaskRunner {
  constructor(private readonly createClient: () => SvyunClientLike) {}

  async run(account: SvyunAccount): Promise<AccountRunResult> {
    const client = this.createClient();
    const stages: StageResult[] = [];

    const login = await client.login(account.username, account.password);
    stages.push({ name: 'login', success: login.success, message: login.message });
    if (!login.success) {
      return toResult(account, stages);
    }

    const signInfo = await client.getSignInfo();
    if (signInfo.alreadySigned) {
      stages.push({ name: 'sign', success: true, message: signInfo.message, skipped: true });
    } else {
      const sign = await client.sign();
      stages.push({
        name: 'sign',
        success: sign.success,
        message: sign.message,
        skipped: sign.alreadySigned,
      });
      if (!sign.success) {
        return toResult(account, stages);
      }
    }

    const activityId = await client.getPrimaryDrawActivityId();
    if (activityId === undefined) {
      stages.push({ name: 'draw', success: true, message: '没有可参与的抽奖活动', skipped: true });
      return toResult(account, stages);
    }

    const drawTimes = await client.getDrawTimes(activityId);
    if (!drawTimes.available) {
      stages.push({ name: 'draw', success: true, message: drawTimes.message, skipped: true });
      return toResult(account, stages);
    }

    const draw = await client.draw(activityId);
    stages.push({
      name: 'draw',
      success: draw.success,
      message: draw.message,
      skipped: draw.skipped,
    });

    return toResult(account, stages);
  }
}

function toResult(account: SvyunAccount, stages: StageResult[]): AccountRunResult {
  return {
    accountId: account.id,
    accountName: account.displayName,
    usernameMasked: account.usernameMasked,
    success: stages.every((stage) => stage.success),
    stages,
  };
}
