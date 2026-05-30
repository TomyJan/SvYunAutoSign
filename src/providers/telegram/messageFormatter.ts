import type { WorkflowResult } from '../../core/task.js';

export function formatTelegramMessage(result: WorkflowResult): string {
  const lines = [
    `SvYun 自动签到结果：${result.success ? '全部成功' : '部分失败'}`,
    '',
    ...result.accounts.flatMap((account) => [
      `${account.success ? '✅' : '❌'} ${account.accountName}（${account.usernameMasked}）`,
      ...account.stages.map((stage) => `${iconForStage(stage)} ${stage.name}：${stage.message}`),
      '',
    ]),
  ];

  return lines.join('\n').trimEnd();
}

function iconForStage(stage: { success: boolean; skipped?: boolean }): string {
  if (stage.skipped) return '⏭️';
  return stage.success ? '✅' : '❌';
}
