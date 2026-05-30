export interface SvyunAccount {
  id: string;
  displayName: string;
  username: string;
  password: string;
  usernameMasked: string;
}

export function maskAccount(account: string): string {
  if (/^\d{11}$/.test(account)) {
    return `${account.slice(0, 3)}****${account.slice(-4)}`;
  }

  const atIndex = account.indexOf('@');
  if (atIndex > 0) {
    return `${account.slice(0, 1)}***${account.slice(atIndex)}`;
  }

  if (account.length <= 2) {
    return '*'.repeat(account.length);
  }

  return `${account.slice(0, 1)}***${account.slice(-1)}`;
}
