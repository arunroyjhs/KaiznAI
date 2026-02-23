export interface AgentSDKConfig {
  apiUrl: string;
  apiKey?: string;
  agentName: string;
  agentRuntime: 'claude-code' | 'cursor' | 'windsurf' | 'devin' | 'custom-rest';
  version?: string;
  capabilities?: string[];
  heartbeatIntervalMs?: number;
}

export interface ExperimentBrief {
  experimentId: string;
  title: string;
  hypothesis: string;
  intervention: {
    type: string;
    scope: string;
    description: string;
    featureFlagKey?: string;
  };
  scope: {
    allowedPaths: string[];
    forbiddenPaths: string[];
  };
  constraints: string[];
  measurementPlan: {
    durationDays: number;
    successThreshold: number;
    killThreshold: number;
  };
}

export interface BuildReport {
  implementationSummary: string;
  filesChanged: string[];
  featureFlagKey?: string;
  agentNotes?: string;
}

export class OutcomeAgentSDK {
  private agentId: string | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private config: AgentSDKConfig;

  constructor(config: AgentSDKConfig) {
    this.config = {
      heartbeatIntervalMs: 30_000,
      ...config,
    };
  }

  /**
   * Register this agent with the Outcome Runtime.
   * Must be called before any other operations.
   */
  async connect(): Promise<string> {
    const response = await this.request('POST', '/api/v1/agents/register', {
      runtime: this.config.agentRuntime,
      name: this.config.agentName,
      version: this.config.version,
      capabilities: this.config.capabilities ?? [],
    });

    this.agentId = response.id;
    this.startHeartbeat();
    return this.agentId;
  }

  /**
   * Disconnect this agent from the runtime.
   */
  async disconnect(): Promise<void> {
    this.stopHeartbeat();
    if (this.agentId) {
      await this.request('DELETE', `/api/v1/agents/${this.agentId}`);
      this.agentId = null;
    }
  }

  /**
   * Get all active outcomes with their experiment portfolios.
   */
  async getActiveOutcomes(): Promise<unknown[]> {
    const response = await this.request('GET', '/api/v1/outcomes?status=active');
    return response.outcomes ?? [];
  }

  /**
   * Get the experiment brief — the full context an agent needs to build.
   */
  async getExperimentBrief(experimentId: string): Promise<ExperimentBrief> {
    const response = await this.request('GET', `/api/v1/experiments/${experimentId}/brief`);
    return response.brief;
  }

  /**
   * Report that the experiment has been built.
   */
  async reportBuilt(experimentId: string, report: BuildReport): Promise<void> {
    this.ensureConnected();
    await this.logAction(experimentId, 'report_built', report);
    await this.request('POST', `/api/v1/experiments/${experimentId}/built`, {
      implementation_summary: report.implementationSummary,
      files_changed: report.filesChanged,
      feature_flag_key: report.featureFlagKey,
      agent_notes: report.agentNotes,
    });
  }

  /**
   * Log a file change for conflict detection.
   */
  async logFileChange(
    experimentId: string,
    filePath: string,
    changeType: 'create' | 'modify' | 'delete',
  ): Promise<void> {
    this.ensureConnected();
    await this.request('POST', `/api/v1/agents/${this.agentId}/actions`, {
      experimentId,
      action: 'file_change',
      details: { filePath, changeType },
      filesAffected: [filePath],
    });
  }

  /**
   * Query the learning library.
   */
  async queryLearnings(query: string, limit: number = 10): Promise<unknown[]> {
    const response = await this.request('GET', `/api/v1/learnings?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.learnings ?? [];
  }

  /**
   * Request a human gate (when agent needs approval for something).
   */
  async requestGate(
    experimentId: string,
    gateType: string,
    question: string,
  ): Promise<{ gateId: string }> {
    this.ensureConnected();
    const response = await this.request('POST', '/api/v1/gates', {
      experiment_id: experimentId,
      gate_type: gateType,
      question,
    });
    return { gateId: response.id };
  }

  /**
   * Update the agent's status.
   */
  async updateStatus(status: string, message?: string): Promise<void> {
    this.ensureConnected();
    await this.request('POST', `/api/v1/agents/${this.agentId}/heartbeat`, {
      status,
      message,
    });
  }

  private ensureConnected(): void {
    if (!this.agentId) {
      throw new Error('Agent not connected. Call connect() first.');
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(async () => {
      try {
        if (this.agentId) {
          await this.request('POST', `/api/v1/agents/${this.agentId}/heartbeat`, {
            status: 'idle',
          });
        }
      } catch {
        // Heartbeat failure is non-critical
      }
    }, this.config.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private async logAction(experimentId: string, action: string, details: Record<string, unknown>): Promise<void> {
    await this.request('POST', `/api/v1/agents/${this.agentId}/actions`, {
      experimentId,
      action,
      details,
    });
  }

  private async request(method: string, path: string, body?: unknown): Promise<any> {
    const url = `${this.config.apiUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    if (this.agentId) {
      headers['X-Agent-ID'] = this.agentId;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API request failed: ${method} ${path} — ${response.status}: ${errorBody}`);
    }

    return response.json();
  }
}
