import type { SvyunAccount } from '../../core/account.js';
import type { AccountRunResult, StageResult } from '../../core/task.js';
import type { AccountTaskRunner } from '../../core/workflow.js';
import type { SvyunClientLike, SvyunDrawResult, SvyunDrawSummary } from './apiTypes.js';

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
      stages.push({
        name: 'sign',
        success: true,
        message: signInfo.message,
        skipped: true,
        details: { ...signInfo },
      });
    } else {
      const sign = await client.sign();
      stages.push({
        name: 'sign',
        success: sign.success,
        message: sign.message,
        skipped: sign.alreadySigned,
        details: { ...sign },
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

    const drawStage = await drawAllAvailableTimes(client, activityId, drawTimes.availableTimes);
    stages.push(drawStage);

    return toResult(account, stages);
  }
}

async function drawAllAvailableTimes(
  client: SvyunClientLike,
  activityId: number,
  availableTimes: number,
): Promise<StageResult> {
  const draws: SvyunDrawResult[] = [];

  for (let index = 0; index < availableTimes; index += 1) {
    const draw = await client.draw(activityId);
    draws.push(draw);

    if (!draw.success) {
      return {
        name: 'draw',
        success: false,
        message: draw.message,
        skipped: draw.skipped,
        details: { ...buildDrawSummary(draws) },
      };
    }
  }

  const summary = buildDrawSummary(draws);
  return {
    name: 'draw',
    success: true,
    message: formatDrawSummaryMessage(summary),
    details: { ...summary },
  };
}

function buildDrawSummary(draws: SvyunDrawResult[]): SvyunDrawSummary {
  const prizes = draws.reduce<SvyunDrawSummary['prizes']>((items, draw) => {
    const name = draw.prizeName || draw.message || '未知奖品';
    const isWin = draw.isWin === true && name !== '谢谢参与';
    const existing = items.find((item) => item.name === name);

    if (existing) {
      existing.count += 1;
      existing.isWin ||= isWin;
      return items;
    }

    items.push({ name, count: 1, isWin });
    return items;
  }, []);

  return {
    totalDraws: draws.length,
    prizes,
    hasPrizeWin: prizes.some((prize) => prize.isWin),
  };
}

function formatDrawSummaryMessage(summary: SvyunDrawSummary): string {
  const prizeText = summary.prizes.map((prize) => `${prize.name} ×${prize.count}`).join('，');
  return `共抽奖 ${summary.totalDraws} 次：${prizeText}`;
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
