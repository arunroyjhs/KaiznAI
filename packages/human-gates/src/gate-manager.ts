import type { GateCreateInput, GateResponse, GateNotification, NotificationChannel } from './types.js';
import { SLAMonitor, type SLAStatus } from './sla-monitor.js';

export interface Gate {
  id: string;
  experimentId: string;
  outcomeId: string;
  gateType: string;
  question: string;
  contextPackage: Record<string, unknown>;
  signalSnapshot?: Record<string, unknown>;
  options?: Record<string, unknown>;
  assignedTo: string;
  escalationChain: string[];
  slaHours: number;
  status: 'pending' | 'approved' | 'rejected' | 'approved_with_conditions' | 'delegated' | 'timed_out';
  conditions: string[];
  responseNote?: string;
  decidedBy?: string;
  notificationSentAt?: Date;
  reminderSentAt?: Date;
  createdAt: Date;
  respondedAt?: Date;
  orgId: string;
}

export interface GateStore {
  create(gate: Omit<Gate, 'id'>): Promise<Gate>;
  findById(id: string): Promise<Gate | null>;
  findPendingByAssignee(assignedTo: string, orgId: string): Promise<Gate[]>;
  update(id: string, updates: Partial<Gate>): Promise<Gate>;
}

/**
 * Manages the lifecycle of human gates.
 */
export class GateManager {
  private slaMonitor: SLAMonitor;

  constructor(
    private store: GateStore,
    private notificationChannels: NotificationChannel[],
  ) {
    this.slaMonitor = new SLAMonitor();
  }

  /**
   * Create a new gate and notify the assigned person.
   */
  async createGate(input: GateCreateInput): Promise<Gate> {
    const gate = await this.store.create({
      experimentId: input.experimentId,
      outcomeId: input.outcomeId,
      gateType: input.gateType,
      question: input.question,
      contextPackage: input.contextPackage,
      signalSnapshot: input.signalSnapshot,
      options: input.options,
      assignedTo: input.assignedTo,
      escalationChain: input.escalationChain ?? [],
      slaHours: input.slaHours ?? 24,
      status: 'pending',
      conditions: [],
      createdAt: new Date(),
      orgId: input.orgId,
    });

    // Send notification
    await this.notify(gate);

    return gate;
  }

  /**
   * Record a human decision on a gate.
   */
  async respondToGate(response: GateResponse): Promise<Gate> {
    const gate = await this.store.findById(response.gateId);
    if (!gate) {
      throw new Error(`Gate ${response.gateId} not found`);
    }

    if (gate.status !== 'pending') {
      throw new Error(`Gate ${response.gateId} is already ${gate.status}`);
    }

    return this.store.update(response.gateId, {
      status: response.status,
      conditions: response.conditions ?? [],
      responseNote: response.responseNote,
      decidedBy: response.decidedBy,
      respondedAt: new Date(),
    });
  }

  /**
   * Get all pending gates for a user.
   */
  async getPendingGates(assignedTo: string, orgId: string): Promise<Gate[]> {
    return this.store.findPendingByAssignee(assignedTo, orgId);
  }

  /**
   * Check SLA status and handle reminders/escalation.
   */
  async checkAndHandleSLA(gate: Gate): Promise<SLAStatus> {
    const status = this.slaMonitor.checkSLA(
      gate.id,
      gate.assignedTo,
      gate.slaHours,
      gate.createdAt,
      gate.reminderSentAt,
    );

    if (status.shouldRemind) {
      await this.notify(gate);
      await this.store.update(gate.id, { reminderSentAt: new Date() });
    }

    if (status.shouldEscalate) {
      const nextAssignee = this.slaMonitor.getEscalationTarget(
        gate.escalationChain,
        gate.assignedTo,
      );

      if (nextAssignee) {
        await this.store.update(gate.id, {
          assignedTo: nextAssignee,
          status: 'delegated',
        });

        const updatedGate = { ...gate, assignedTo: nextAssignee };
        await this.notify(updatedGate);
      } else {
        await this.store.update(gate.id, { status: 'timed_out' });
      }
    }

    return status;
  }

  private async notify(gate: Gate): Promise<void> {
    const notification: GateNotification = {
      gateId: gate.id,
      assignedTo: gate.assignedTo,
      gateType: gate.gateType,
      question: gate.question,
      experimentTitle: String(gate.contextPackage['experimentTitle'] ?? 'Experiment'),
      outcomeTitle: String(gate.contextPackage['outcomeTitle'] ?? 'Outcome'),
      slaHours: gate.slaHours,
      dashboardUrl: `${process.env.APP_URL ?? 'http://localhost:3000'}/gates/${gate.id}`,
    };

    await Promise.all(
      this.notificationChannels.map((channel) => channel.send(notification)),
    );

    await this.store.update(gate.id, { notificationSentAt: new Date() });
  }
}
