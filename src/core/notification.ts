export interface NotificationProvider {
  readonly name: string;
  send(message: string): Promise<void>;
}
