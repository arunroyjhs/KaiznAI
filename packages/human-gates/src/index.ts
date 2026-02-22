export { GateManager } from './gate-manager.js';
export type { Gate, GateStore } from './gate-manager.js';
export { SLAMonitor } from './sla-monitor.js';
export type { SLAStatus } from './sla-monitor.js';
export { EmailNotificationChannel, ConsoleNotificationChannel } from './notifications.js';
export type { EmailConfig } from './notifications.js';
export type {
  GateCreateInput,
  GateResponse,
  GateNotification,
  NotificationChannel,
} from './types.js';

// Slack integration available at @outcome-runtime/notification-slack
