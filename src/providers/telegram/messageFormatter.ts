import type { WorkflowResult } from '../../core/task.js';

export function formatTelegramMessage(result: WorkflowResult): string {
  const lines = [
    '📋 速维云自动签到结果',
    '',
    `状态：${result.success ? '✅ 全部成功' : '❌ 部分失败'}`,
    '',
    ...result.accounts.flatMap((account) => {
      const stageLines = account.stages.map((stage, index) => {
        const branch = index === account.stages.length - 1 ? '└' : '├';
        return `${branch} ${iconForStage(stage)} ${labelForStage(stage.name)}：${stage.message}`;
      });

      return [`👤 ${account.accountName}（${account.usernameMasked}）`, ...stageLines, ''];
    }),
  ];

  return lines.join('\n').trimEnd();
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

function iconForStage(stage: { success: boolean; skipped?: boolean }): string {
  if (stage.skipped) return '⏭️';
  return stage.success ? '✅' : '❌';
}
