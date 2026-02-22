import type { GateNotification, NotificationChannel } from './types.js';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  from: string;
  auth?: {
    user: string;
    pass: string;
  };
}

export class EmailNotificationChannel implements NotificationChannel {
  constructor(private config: EmailConfig) {}

  async send(notification: GateNotification): Promise<void> {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
    });

    const subject = `[Outcome Runtime] ${notification.gateType.replace(/_/g, ' ')} needed: ${notification.experimentTitle}`;

    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366F1;">Human Gate: ${notification.gateType.replace(/_/g, ' ')}</h2>
        <p><strong>Outcome:</strong> ${notification.outcomeTitle}</p>
        <p><strong>Experiment:</strong> ${notification.experimentTitle}</p>
        <p><strong>Question:</strong> ${notification.question}</p>
        <p><strong>SLA:</strong> ${notification.slaHours} hours</p>
        <p>
          <a href="${notification.dashboardUrl}"
             style="display: inline-block; padding: 12px 24px; background: #6366F1; color: white; text-decoration: none; border-radius: 6px;">
            Review & Decide
          </a>
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: this.config.from,
      to: notification.assignedTo,
      subject,
      html,
    });
  }
}

export class ConsoleNotificationChannel implements NotificationChannel {
  async send(notification: GateNotification): Promise<void> {
    console.log(`[GATE] ${notification.gateType} for ${notification.experimentTitle}`);
    console.log(`  Assigned to: ${notification.assignedTo}`);
    console.log(`  Question: ${notification.question}`);
    console.log(`  SLA: ${notification.slaHours}h`);
    console.log(`  URL: ${notification.dashboardUrl}`);
  }
}
