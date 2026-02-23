export interface SLAStatus {
  gateId: string;
  assignedTo: string;
  slaHours: number;
  createdAt: Date;
  hoursElapsed: number;
  percentUsed: number;
  isOverdue: boolean;
  shouldRemind: boolean;
  shouldEscalate: boolean;
}

/**
 * Monitors SLA compliance for human gates.
 */
export class SLAMonitor {
  /**
   * Check the SLA status of a gate.
   */
  checkSLA(
    gateId: string,
    assignedTo: string,
    slaHours: number,
    createdAt: Date,
    reminderSentAt?: Date,
  ): SLAStatus {
    const now = new Date();
    const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    const percentUsed = (hoursElapsed / slaHours) * 100;
    const isOverdue = hoursElapsed >= slaHours;

    // Send reminder at 50% of SLA if not already sent
    const shouldRemind = percentUsed >= 50 && !reminderSentAt && !isOverdue;

    // Escalate when SLA expires
    const shouldEscalate = isOverdue;

    return {
      gateId,
      assignedTo,
      slaHours,
      createdAt,
      hoursElapsed: Math.round(hoursElapsed * 10) / 10,
      percentUsed: Math.round(percentUsed),
      isOverdue,
      shouldRemind,
      shouldEscalate,
    };
  }

  /**
   * Get the next assignee from the escalation chain.
   */
  getEscalationTarget(
    escalationChain: string[],
    currentAssignee: string,
  ): string | undefined {
    const currentIndex = escalationChain.indexOf(currentAssignee);
    if (currentIndex === -1) return escalationChain[0];
    return escalationChain[currentIndex + 1];
  }
}
