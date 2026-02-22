export interface FileChange {
  agentId: string;
  experimentId: string;
  filePath: string;
  changeType: 'create' | 'modify' | 'delete';
  timestamp: Date;
}

export interface Conflict {
  id: string;
  type: 'file_overlap' | 'path_overlap' | 'resource_contention';
  severity: 'warning' | 'critical';
  experimentIds: string[];
  agentIds: string[];
  description: string;
  affectedPaths: string[];
  detectedAt: Date;
  resolved: boolean;
}

export interface ConflictDetectorStore {
  getActiveFileChanges(orgId: string): Promise<FileChange[]>;
  recordConflict(conflict: Omit<Conflict, 'id' | 'detectedAt'>): Promise<Conflict>;
  getActiveConflicts(orgId: string): Promise<Conflict[]>;
  resolveConflict(conflictId: string): Promise<void>;
}

export class ConflictDetector {
  constructor(private store: ConflictDetectorStore) {}

  /**
   * Check if a set of file changes conflicts with any active experiments.
   * Returns any detected conflicts.
   */
  async checkForConflicts(
    agentId: string,
    experimentId: string,
    filePaths: string[],
    orgId: string,
  ): Promise<Conflict[]> {
    const activeChanges = await this.store.getActiveFileChanges(orgId);
    const conflicts: Conflict[] = [];

    for (const filePath of filePaths) {
      // Find other experiments touching the same file
      const overlapping = activeChanges.filter(
        (change) =>
          change.experimentId !== experimentId &&
          (change.filePath === filePath || this.isParentChild(change.filePath, filePath)),
      );

      if (overlapping.length > 0) {
        const otherExperimentIds = [...new Set(overlapping.map((c) => c.experimentId))];
        const otherAgentIds = [...new Set(overlapping.map((c) => c.agentId))];

        const conflict = await this.store.recordConflict({
          type: 'file_overlap',
          severity: overlapping.some((c) => c.filePath === filePath) ? 'critical' : 'warning',
          experimentIds: [experimentId, ...otherExperimentIds],
          agentIds: [agentId, ...otherAgentIds],
          description: `File "${filePath}" is being modified by multiple experiments: ${[experimentId, ...otherExperimentIds].join(', ')}`,
          affectedPaths: [filePath, ...overlapping.map((c) => c.filePath)],
          resolved: false,
        });

        conflicts.push(conflict);
      }
    }

    return conflicts;
  }

  /**
   * Check if a path is a parent or child of another path.
   */
  private isParentChild(pathA: string, pathB: string): boolean {
    const normA = pathA.replace(/\\/g, '/');
    const normB = pathB.replace(/\\/g, '/');
    return normA.startsWith(normB + '/') || normB.startsWith(normA + '/');
  }

  /**
   * Get all active conflicts for an organization.
   */
  async getActiveConflicts(orgId: string): Promise<Conflict[]> {
    return this.store.getActiveConflicts(orgId);
  }

  /**
   * Resolve a conflict (manually acknowledged by human).
   */
  async resolveConflict(conflictId: string): Promise<void> {
    return this.store.resolveConflict(conflictId);
  }
}
