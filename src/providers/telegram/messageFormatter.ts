import type { StageResult, WorkflowResult } from '../../core/task.js';

export function formatTelegramMessage(result: WorkflowResult): string {
  const lines = [
    '📋 速维云自动签到结果',
    '',
    `状态：${result.success ? '✅ 全部成功' : '❌ 部分失败'}`,
    '',
    ...result.accounts.flatMap((account) => {
      const stageLines = account.stages.map((stage, index) => {
        const branch = index === account.stages.length - 1 ? '└' : '├';
        return `${branch} ${iconForStage(stage)} ${labelForStage(stage.name)}：${messageForStage(stage)}`;
      });

      return [`👤 ${account.accountName}（${account.usernameMasked}）`, ...stageLines, ''];
    }),
  ];

  return lines.join('\n').trimEnd();
}

function messageForStage(stage: StageResult): string {
  if (stage.name === 'sign') {
    return formatSignMessage(stage);
  }

  if (stage.name === 'draw') {
    return formatDrawMessage(stage);
  }

  return stage.message;
}

function formatSignMessage(stage: StageResult): string {
  const details = stage.details ?? {};
  const parts = [stage.message];
  const currentStreak = asNumber(details.currentStreak);
  const missedDays = asNumber(details.missedDays);
  const drawBonusTimes = asNumber(details.drawBonusTimes);

  if (currentStreak !== undefined && currentStreak > 1) {
    parts.push(`连签 ${currentStreak} 天`);
  } else if (currentStreak === 1 && missedDays !== undefined && missedDays > 0) {
    parts.push(`断签 ${missedDays} 天`);
  }

  if (drawBonusTimes !== undefined && drawBonusTimes > 0) {
    parts.push(`抽奖次数 +${drawBonusTimes}`);
  }

  return parts.join('，');
}

function formatDrawMessage(stage: StageResult): string {
  const details = stage.details ?? {};
  const totalDraws = asNumber(details.totalDraws);
  const prizes = Array.isArray(details.prizes) ? details.prizes : undefined;

  if (totalDraws === undefined || !prizes) {
    return stage.message;
  }

  const prizeText = prizes
    .map((prize) => {
      if (!isPrizeSummary(prize)) return undefined;

      const text = `${prize.name} ×${prize.count}`;
      return prize.isWin ? `⭐ ${text} ⭐` : text;
    })
    .filter((text) => text !== undefined)
    .join('，');

  return prizeText ? `共抽奖 ${totalDraws} 次：${prizeText}` : stage.message;
}

function isPrizeSummary(value: unknown): value is { name: string; count: number; isWin: boolean } {
  if (typeof value !== 'object' || value === null) return false;
  const prize = value as Record<string, unknown>;
  return (
    typeof prize.name === 'string' &&
    typeof prize.count === 'number' &&
    typeof prize.isWin === 'boolean'
  );
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function labelForStage(name: string): string {
  const labels: Record<string, string> = {
    login: '登录',
    sign: '签到',
    draw: '抽奖',
    account: '账号',
  };
  return labels[name] ?? name;
}

function iconForStage(stage: StageResult): string {
  if (stage.name === 'draw' && stage.details?.hasPrizeWin === true) return '🎉';
  if (stage.skipped) return '⏭️';
  return stage.success ? '✅' : '❌';
}
