import type { GateNotification, NotificationChannel } from '@outcome-runtime/human-gates';

interface SlackConfig {
  botToken: string;
  defaultChannel: string;
}

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: SlackBlock[];
  fields?: Array<{ type: string; text: string }>;
  accessory?: SlackBlock;
  action_id?: string;
  value?: string;
  style?: string;
  block_id?: string;
}

export class SlackNotificationChannel implements NotificationChannel {
  private apiUrl = 'https://slack.com/api';

  constructor(private config: SlackConfig) {}

  async send(notification: GateNotification): Promise<void> {
    const channel = this.config.defaultChannel;
    const blocks = this.buildBlocks(notification);

    const response = await fetch(`${this.apiUrl}/chat.postMessage`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        text: `Human Gate: ${notification.gateType.replace(/_/g, ' ')} — ${notification.experimentTitle}`,
        blocks,
      }),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }
  }

  private buildBlocks(notification: GateNotification): SlackBlock[] {
    const gateTypeLabel = notification.gateType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🔔 ${gateTypeLabel}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Outcome:*\n${notification.outcomeTitle}` },
          { type: 'mrkdwn', text: `*Experiment:*\n${notification.experimentTitle}` },
          { type: 'mrkdwn', text: `*Assigned to:*\n${notification.assignedTo}` },
          { type: 'mrkdwn', text: `*SLA:*\n${notification.slaHours} hours` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Question:*\n${notification.question}`,
        },
      },
      {
        type: 'actions',
        block_id: `gate_action_${notification.gateId}`,
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Approve', emoji: true },
            style: 'primary',
            action_id: 'gate_approve',
            value: notification.gateId,
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Reject', emoji: true },
            style: 'danger',
            action_id: 'gate_reject',
            value: notification.gateId,
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Details', emoji: true },
            action_id: 'gate_view',
            value: notification.dashboardUrl,
          },
        ],
      },
    ];
  }
}

/**
 * Handle Slack interactive button callbacks.
 * Mount this at POST /api/v1/integrations/slack/interactions
 */
export async function handleSlackInteraction(
  payload: {
    type: string;
    actions: Array<{
      action_id: string;
      value: string;
      block_id: string;
    }>;
    user: { id: string; name: string };
    response_url: string;
  },
  onGateResponse: (gateId: string, status: 'approved' | 'rejected', decidedBy: string) => Promise<void>,
): Promise<void> {
  if (payload.type !== 'block_actions') return;

  for (const action of payload.actions) {
    if (action.action_id === 'gate_approve' || action.action_id === 'gate_reject') {
      const gateId = action.value;
      const status = action.action_id === 'gate_approve' ? 'approved' : 'rejected';

      await onGateResponse(gateId, status, payload.user.name);

      // Update the Slack message to show the decision
      const statusEmoji = status === 'approved' ? '✅' : '❌';
      const statusText = status === 'approved' ? 'Approved' : 'Rejected';

      await fetch(payload.response_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replace_original: true,
          text: `${statusEmoji} Gate ${statusText} by ${payload.user.name}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `${statusEmoji} *Gate ${statusText}* by <@${payload.user.id}> at ${new Date().toISOString()}`,
              },
            },
          ],
        }),
      });
    }

    if (action.action_id === 'gate_view') {
      // The URL is opened client-side by Slack — no server action needed
    }
  }
}
