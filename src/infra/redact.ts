const authorizationPattern = /authorization=Bearer\s+\S+/gi;
const keyValuePattern = /(password|token|cookie|authorization)=([^\s]+)/gi;

export function redactSensitive(text: string, secrets: readonly string[] = []): string {
  let redacted = text.replace(authorizationPattern, 'authorization=***');
  redacted = redacted.replace(keyValuePattern, '$1=***');

  for (const secret of secrets) {
    if (!secret) continue;
    redacted = redacted.split(secret).join('***');
  }

  return redacted;
}
