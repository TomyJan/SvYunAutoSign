export interface SvyunApiResponse<T = unknown> {
  status: number;
  msg?: string;
  data?: T;
}

export interface SvyunLoginData {
  jwt?: string;
}

export interface SvyunLoginResult {
  success: boolean;
  message: string;
  jwt?: string;
}

export interface SvyunSignInfo {
  alreadySigned: boolean;
  totalCheckins?: number;
  currentStreak?: number;
  message: string;
}

export interface SvyunSignResult {
  success: boolean;
  alreadySigned: boolean;
  message: string;
  checkinCount?: number;
  currentStreak?: number;
}

export interface SvyunDrawTimes {
  available: boolean;
  availableTimes: number;
  usedTimes: number;
  message: string;
}

export interface SvyunDrawResult {
  success: boolean;
  skipped: boolean;
  isWin?: boolean;
  prizeName?: string;
  message: string;
}

export interface SvyunClientLike {
  login(username: string, password: string): Promise<SvyunLoginResult>;
  getSignInfo(): Promise<SvyunSignInfo>;
  sign(): Promise<SvyunSignResult>;
  getPrimaryDrawActivityId(): Promise<number | undefined>;
  getDrawTimes(activityId: number): Promise<SvyunDrawTimes>;
  draw(activityId: number): Promise<SvyunDrawResult>;
}
