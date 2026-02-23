export interface GateCreateInput {
  experimentId: string;
  outcomeId: string;
  gateType: 'portfolio_review' | 'launch_approval' | 'analysis_review' | 'scale_approval' | 'ship_approval';
  question: string;
  contextPackage: Record<string, unknown>;
  signalSnapshot?: Record<string, unknown>;
  options?: Record<string, unknown>;
  assignedTo: string;
  escalationChain?: string[];
  slaHours?: number;
  orgId: string;
}

export interface GateResponse {
  gateId: string;
  status: 'approved' | 'rejected' | 'approved_with_conditions';
  conditions?: string[];
  responseNote?: string;
  decidedBy: string;
}

export interface GateNotification {
  gateId: string;
  assignedTo: string;
  gateType: string;
  question: string;
  experimentTitle: string;
  outcomeTitle: string;
  slaHours: number;
  dashboardUrl: string;
}

export interface NotificationChannel {
  send(notification: GateNotification): Promise<void>;
}
