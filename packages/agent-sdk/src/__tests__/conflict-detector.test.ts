import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictDetector } from '../conflict-detector.js';
import type { ConflictDetectorStore, FileChange, Conflict } from '../conflict-detector.js';

function createMockStore(): ConflictDetectorStore {
  return {
    getActiveFileChanges: vi.fn(),
    recordConflict: vi.fn(),
    getActiveConflicts: vi.fn(),
    resolveConflict: vi.fn(),
  };
}

function makeFileChange(overrides: Partial<FileChange> = {}): FileChange {
  return {
    agentId: 'agent-1',
    experimentId: 'exp-1',
    filePath: '/src/index.ts',
    changeType: 'modify',
    timestamp: new Date(),
    ...overrides,
  };
}

function makeConflict(overrides: Partial<Conflict> = {}): Conflict {
  return {
    id: 'conflict-1',
    type: 'file_overlap',
    severity: 'critical',
    experimentIds: ['exp-1', 'exp-2'],
    agentIds: ['agent-1', 'agent-2'],
    description: 'File conflict',
    affectedPaths: ['/src/index.ts'],
    detectedAt: new Date(),
    resolved: false,
    ...overrides,
  };
}

describe('ConflictDetector', () => {
  let store: ConflictDetectorStore;
  let detector: ConflictDetector;

  beforeEach(() => {
    store = createMockStore();
    detector = new ConflictDetector(store);
  });

  describe('checkForConflicts', () => {
    it('should return no conflicts when there are no overlapping files', async () => {
      const existingChanges = [
        makeFileChange({
          agentId: 'agent-other',
          experimentId: 'exp-other',
          filePath: '/src/other.ts',
        }),
      ];
      vi.mocked(store.getActiveFileChanges).mockResolvedValue(existingChanges);

      const conflicts = await detector.checkForConflicts(
        'agent-1',
        'exp-1',
        ['/src/index.ts'],
        'org-1',
      );

      expect(conflicts).toEqual([]);
      expect(store.recordConflict).not.toHaveBeenCalled();
    });

    it('should detect exact file overlap with critical severity', async () => {
      const existingChanges = [
        makeFileChange({
          agentId: 'agent-2',
          experimentId: 'exp-2',
          filePath: '/src/shared.ts',
        }),
      ];
      vi.mocked(store.getActiveFileChanges).mockResolvedValue(existingChanges);

      const recordedConflict = makeConflict({
        severity: 'critical',
        experimentIds: ['exp-1', 'exp-2'],
        agentIds: ['agent-1', 'agent-2'],
        affectedPaths: ['/src/shared.ts', '/src/shared.ts'],
      });
      vi.mocked(store.recordConflict).mockResolvedValue(recordedConflict);

      const conflicts = await detector.checkForConflicts(
        'agent-1',
        'exp-1',
        ['/src/shared.ts'],
        'org-1',
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].severity).toBe('critical');
      expect(store.recordConflict).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'file_overlap',
          severity: 'critical',
          experimentIds: ['exp-1', 'exp-2'],
          agentIds: ['agent-1', 'agent-2'],
          resolved: false,
        }),
      );
    });

    it('should detect parent/child path overlap with warning severity', async () => {
      const existingChanges = [
        makeFileChange({
          agentId: 'agent-2',
          experimentId: 'exp-2',
          filePath: '/src/components',
        }),
      ];
      vi.mocked(store.getActiveFileChanges).mockResolvedValue(existingChanges);

      const recordedConflict = makeConflict({ severity: 'warning' });
      vi.mocked(store.recordConflict).mockResolvedValue(recordedConflict);

      const conflicts = await detector.checkForConflicts(
        'agent-1',
        'exp-1',
        ['/src/components/Button.tsx'],
        'org-1',
      );

      expect(conflicts).toHaveLength(1);
      // Parent/child but no exact match should be 'warning'
      expect(store.recordConflict).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warning',
        }),
      );
    });

    it('should record conflicts in store', async () => {
      const existingChanges = [
        makeFileChange({
          agentId: 'agent-2',
          experimentId: 'exp-2',
          filePath: '/src/index.ts',
        }),
      ];
      vi.mocked(store.getActiveFileChanges).mockResolvedValue(existingChanges);

      const recordedConflict = makeConflict();
      vi.mocked(store.recordConflict).mockResolvedValue(recordedConflict);

      await detector.checkForConflicts('agent-1', 'exp-1', ['/src/index.ts'], 'org-1');

      expect(store.recordConflict).toHaveBeenCalledTimes(1);
      expect(store.recordConflict).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'file_overlap',
          resolved: false,
          description: expect.stringContaining('/src/index.ts'),
        }),
      );
    });

    it('should ignore changes from the same experiment', async () => {
      const existingChanges = [
        makeFileChange({
          agentId: 'agent-1',
          experimentId: 'exp-1', // Same experiment
          filePath: '/src/index.ts',
        }),
      ];
      vi.mocked(store.getActiveFileChanges).mockResolvedValue(existingChanges);

      const conflicts = await detector.checkForConflicts(
        'agent-1',
        'exp-1',
        ['/src/index.ts'],
        'org-1',
      );

      expect(conflicts).toEqual([]);
      expect(store.recordConflict).not.toHaveBeenCalled();
    });

    it('should return no conflicts when there are no active changes at all', async () => {
      vi.mocked(store.getActiveFileChanges).mockResolvedValue([]);

      const conflicts = await detector.checkForConflicts(
        'agent-1',
        'exp-1',
        ['/src/index.ts'],
        'org-1',
      );

      expect(conflicts).toEqual([]);
    });

    it('should detect conflicts for multiple files', async () => {
      const existingChanges = [
        makeFileChange({
          agentId: 'agent-2',
          experimentId: 'exp-2',
          filePath: '/src/a.ts',
        }),
        makeFileChange({
          agentId: 'agent-3',
          experimentId: 'exp-3',
          filePath: '/src/b.ts',
        }),
      ];
      vi.mocked(store.getActiveFileChanges).mockResolvedValue(existingChanges);

      const conflict1 = makeConflict({ id: 'conflict-1' });
      const conflict2 = makeConflict({ id: 'conflict-2' });
      vi.mocked(store.recordConflict)
        .mockResolvedValueOnce(conflict1)
        .mockResolvedValueOnce(conflict2);

      const conflicts = await detector.checkForConflicts(
        'agent-1',
        'exp-1',
        ['/src/a.ts', '/src/b.ts'],
        'org-1',
      );

      expect(conflicts).toHaveLength(2);
      expect(store.recordConflict).toHaveBeenCalledTimes(2);
    });

    it('should include correct description in recorded conflict', async () => {
      const existingChanges = [
        makeFileChange({
          agentId: 'agent-2',
          experimentId: 'exp-2',
          filePath: '/src/shared.ts',
        }),
      ];
      vi.mocked(store.getActiveFileChanges).mockResolvedValue(existingChanges);
      vi.mocked(store.recordConflict).mockResolvedValue(makeConflict());

      await detector.checkForConflicts('agent-1', 'exp-1', ['/src/shared.ts'], 'org-1');

      expect(store.recordConflict).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'File "/src/shared.ts" is being modified by multiple experiments: exp-1, exp-2',
        }),
      );
    });

    it('should deduplicate experiment and agent IDs from overlapping changes', async () => {
      const existingChanges = [
        makeFileChange({
          agentId: 'agent-2',
          experimentId: 'exp-2',
          filePath: '/src/shared.ts',
        }),
        makeFileChange({
          agentId: 'agent-2',
          experimentId: 'exp-2',
          filePath: '/src/shared.ts',
        }),
      ];
      vi.mocked(store.getActiveFileChanges).mockResolvedValue(existingChanges);
      vi.mocked(store.recordConflict).mockResolvedValue(makeConflict());

      await detector.checkForConflicts('agent-1', 'exp-1', ['/src/shared.ts'], 'org-1');

      expect(store.recordConflict).toHaveBeenCalledWith(
        expect.objectContaining({
          experimentIds: ['exp-1', 'exp-2'],
          agentIds: ['agent-1', 'agent-2'],
        }),
      );
    });
  });

  describe('getActiveConflicts', () => {
    it('should delegate to store', async () => {
      const conflicts = [makeConflict()];
      vi.mocked(store.getActiveConflicts).mockResolvedValue(conflicts);

      const result = await detector.getActiveConflicts('org-1');

      expect(store.getActiveConflicts).toHaveBeenCalledWith('org-1');
      expect(result).toBe(conflicts);
    });

    it('should return empty array when no conflicts exist', async () => {
      vi.mocked(store.getActiveConflicts).mockResolvedValue([]);

      const result = await detector.getActiveConflicts('org-1');

      expect(result).toEqual([]);
    });
  });

  describe('resolveConflict', () => {
    it('should delegate to store', async () => {
      vi.mocked(store.resolveConflict).mockResolvedValue(undefined);

      await detector.resolveConflict('conflict-1');

      expect(store.resolveConflict).toHaveBeenCalledWith('conflict-1');
    });
  });
});
