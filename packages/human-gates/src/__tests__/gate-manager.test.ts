import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GateManager } from '../gate-manager.js';
import type { GateStore, Gate } from '../gate-manager.js';
import type { NotificationChannel, GateCreateInput, GateResponse } from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockStore(overrides: Partial<GateStore> = {}): GateStore {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findPendingByAssignee: vi.fn(),
    update: vi.fn(),
    ...overrides,
  };
}

function createMockChannel(): NotificationChannel {
  return { send: vi.fn().mockResolvedValue(undefined) };
}

function makeGate(overrides: Partial<Gate> = {}): Gate {
  return {
    id: 'gate-1',
    experimentId: 'exp-1',
    outcomeId: 'out-1',
    gateType: 'launch_approval',
    question: 'Should we launch?',
    contextPackage: { experimentTitle: 'Exp A', outcomeTitle: 'Outcome B' },
    assignedTo: 'user-1',
    escalationChain: ['user-2', 'user-3'],
    slaHours: 24,
    status: 'pending',
    conditions: [],
    createdAt: new Date(),
    orgId: 'org-1',
    ...overrides,
  };
}

function makeCreateInput(overrides: Partial<GateCreateInput> = {}): GateCreateInput {
  return {
    experimentId: 'exp-1',
    outcomeId: 'out-1',
    gateType: 'launch_approval',
    question: 'Should we launch?',
    contextPackage: { experimentTitle: 'Exp A', outcomeTitle: 'Outcome B' },
    assignedTo: 'user-1',
    escalationChain: ['user-2', 'user-3'],
    slaHours: 24,
    orgId: 'org-1',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GateManager', () => {
  let store: GateStore;
  let channel: NotificationChannel;
  let manager: GateManager;

  beforeEach(() => {
    vi.restoreAllMocks();
    store = createMockStore();
    channel = createMockChannel();
    manager = new GateManager(store, [channel]);
  });

  // -----------------------------------------------------------------------
  // createGate
  // -----------------------------------------------------------------------
  describe('createGate', () => {
    it('creates a gate in the store with pending status and sends notification', async () => {
      const input = makeCreateInput();
      const createdGate = makeGate({ id: 'gate-new' });

      (store.create as ReturnType<typeof vi.fn>).mockResolvedValue(createdGate);
      (store.update as ReturnType<typeof vi.fn>).mockResolvedValue(createdGate);

      const result = await manager.createGate(input);

      // Verify the gate was created in the store
      expect(store.create).toHaveBeenCalledOnce();
      const createArg = (store.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(createArg.status).toBe('pending');
      expect(createArg.experimentId).toBe('exp-1');
      expect(createArg.outcomeId).toBe('out-1');
      expect(createArg.assignedTo).toBe('user-1');
      expect(createArg.slaHours).toBe(24);
      expect(createArg.conditions).toEqual([]);
      expect(createArg.createdAt).toBeInstanceOf(Date);

      // Verify notification was sent
      expect(channel.send).toHaveBeenCalledOnce();
      const notification = (channel.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(notification.gateId).toBe('gate-new');
      expect(notification.assignedTo).toBe('user-1');

      // Verify result is the created gate
      expect(result).toBe(createdGate);
    });

    it('uses default escalationChain and slaHours when not provided', async () => {
      const input = makeCreateInput({ escalationChain: undefined, slaHours: undefined });
      const createdGate = makeGate();

      (store.create as ReturnType<typeof vi.fn>).mockResolvedValue(createdGate);
      (store.update as ReturnType<typeof vi.fn>).mockResolvedValue(createdGate);

      await manager.createGate(input);

      const createArg = (store.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(createArg.escalationChain).toEqual([]);
      expect(createArg.slaHours).toBe(24);
    });

    it('sends notification to all channels', async () => {
      const channel2 = createMockChannel();
      const multiManager = new GateManager(store, [channel, channel2]);
      const createdGate = makeGate();

      (store.create as ReturnType<typeof vi.fn>).mockResolvedValue(createdGate);
      (store.update as ReturnType<typeof vi.fn>).mockResolvedValue(createdGate);

      await multiManager.createGate(makeCreateInput());

      expect(channel.send).toHaveBeenCalledOnce();
      expect(channel2.send).toHaveBeenCalledOnce();
    });
  });

  // -----------------------------------------------------------------------
  // respondToGate
  // -----------------------------------------------------------------------
  describe('respondToGate', () => {
    it('updates status to approved', async () => {
      const gate = makeGate({ id: 'gate-1', status: 'pending' });
      const updatedGate = makeGate({ id: 'gate-1', status: 'approved', decidedBy: 'reviewer-1' });
      const response: GateResponse = {
        gateId: 'gate-1',
        status: 'approved',
        decidedBy: 'reviewer-1',
        responseNote: 'Looks good',
      };

      (store.findById as ReturnType<typeof vi.fn>).mockResolvedValue(gate);
      (store.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedGate);

      const result = await manager.respondToGate(response);

      expect(store.update).toHaveBeenCalledWith('gate-1', expect.objectContaining({
        status: 'approved',
        decidedBy: 'reviewer-1',
        responseNote: 'Looks good',
        conditions: [],
        respondedAt: expect.any(Date),
      }));
      expect(result).toBe(updatedGate);
    });

    it('updates status to rejected', async () => {
      const gate = makeGate({ id: 'gate-2', status: 'pending' });
      const updatedGate = makeGate({ id: 'gate-2', status: 'rejected' });
      const response: GateResponse = {
        gateId: 'gate-2',
        status: 'rejected',
        decidedBy: 'reviewer-1',
        responseNote: 'Not ready',
      };

      (store.findById as ReturnType<typeof vi.fn>).mockResolvedValue(gate);
      (store.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedGate);

      const result = await manager.respondToGate(response);

      expect(store.update).toHaveBeenCalledWith('gate-2', expect.objectContaining({
        status: 'rejected',
      }));
      expect(result).toBe(updatedGate);
    });

    it('updates status to approved_with_conditions', async () => {
      const gate = makeGate({ id: 'gate-3', status: 'pending' });
      const updatedGate = makeGate({ id: 'gate-3', status: 'approved_with_conditions', conditions: ['Fix A', 'Fix B'] });
      const response: GateResponse = {
        gateId: 'gate-3',
        status: 'approved_with_conditions',
        conditions: ['Fix A', 'Fix B'],
        decidedBy: 'reviewer-1',
      };

      (store.findById as ReturnType<typeof vi.fn>).mockResolvedValue(gate);
      (store.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedGate);

      const result = await manager.respondToGate(response);

      expect(store.update).toHaveBeenCalledWith('gate-3', expect.objectContaining({
        status: 'approved_with_conditions',
        conditions: ['Fix A', 'Fix B'],
      }));
      expect(result).toBe(updatedGate);
    });

    it('throws if gate not found', async () => {
      (store.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const response: GateResponse = {
        gateId: 'nonexistent',
        status: 'approved',
        decidedBy: 'reviewer-1',
      };

      await expect(manager.respondToGate(response)).rejects.toThrow(
        'Gate nonexistent not found',
      );
    });

    it('throws if gate already responded (not pending)', async () => {
      const gate = makeGate({ id: 'gate-done', status: 'approved' });
      (store.findById as ReturnType<typeof vi.fn>).mockResolvedValue(gate);

      const response: GateResponse = {
        gateId: 'gate-done',
        status: 'rejected',
        decidedBy: 'reviewer-1',
      };

      await expect(manager.respondToGate(response)).rejects.toThrow(
        'Gate gate-done is already approved',
      );
    });
  });

  // -----------------------------------------------------------------------
  // getPendingGates
  // -----------------------------------------------------------------------
  describe('getPendingGates', () => {
    it('delegates to store.findPendingByAssignee', async () => {
      const pendingGates = [makeGate({ id: 'g1' }), makeGate({ id: 'g2' })];
      (store.findPendingByAssignee as ReturnType<typeof vi.fn>).mockResolvedValue(pendingGates);

      const result = await manager.getPendingGates('user-1', 'org-1');

      expect(store.findPendingByAssignee).toHaveBeenCalledWith('user-1', 'org-1');
      expect(result).toBe(pendingGates);
    });
  });

  // -----------------------------------------------------------------------
  // checkAndHandleSLA
  // -----------------------------------------------------------------------
  describe('checkAndHandleSLA', () => {
    it('sends reminder when over 50% of SLA has elapsed', async () => {
      // Gate created 13 hours ago (>50% of 24h SLA), no reminder sent yet
      const createdAt = new Date(Date.now() - 13 * 60 * 60 * 1000);
      const gate = makeGate({
        id: 'gate-sla',
        createdAt,
        slaHours: 24,
        reminderSentAt: undefined,
      });

      (store.update as ReturnType<typeof vi.fn>).mockResolvedValue(gate);

      const status = await manager.checkAndHandleSLA(gate);

      expect(status.shouldRemind).toBe(true);
      expect(status.isOverdue).toBe(false);

      // Notification sent for reminder
      expect(channel.send).toHaveBeenCalledOnce();
      // Store updated with reminderSentAt
      expect(store.update).toHaveBeenCalledWith('gate-sla', expect.objectContaining({
        reminderSentAt: expect.any(Date),
      }));
    });

    it('escalates when overdue - changes assignee and sends notification', async () => {
      // Gate created 25 hours ago (> 24h SLA)
      const createdAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
      const gate = makeGate({
        id: 'gate-overdue',
        createdAt,
        slaHours: 24,
        assignedTo: 'user-2',
        escalationChain: ['user-2', 'user-3'],
        reminderSentAt: new Date(), // already reminded
      });

      (store.update as ReturnType<typeof vi.fn>).mockResolvedValue(gate);

      const status = await manager.checkAndHandleSLA(gate);

      expect(status.isOverdue).toBe(true);
      expect(status.shouldEscalate).toBe(true);

      // Should have updated assignee to next in chain
      expect(store.update).toHaveBeenCalledWith('gate-overdue', expect.objectContaining({
        assignedTo: 'user-3',
        status: 'delegated',
      }));

      // Notification should be sent to new assignee
      expect(channel.send).toHaveBeenCalled();
      const notification = (channel.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(notification.assignedTo).toBe('user-3');
    });

    it('times out if overdue and no escalation chain target', async () => {
      // Gate created 25 hours ago, current assignee is last in chain
      const createdAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
      const gate = makeGate({
        id: 'gate-timeout',
        createdAt,
        slaHours: 24,
        assignedTo: 'user-3',
        escalationChain: ['user-2', 'user-3'], // user-3 is last
        reminderSentAt: new Date(),
      });

      (store.update as ReturnType<typeof vi.fn>).mockResolvedValue(gate);

      const status = await manager.checkAndHandleSLA(gate);

      expect(status.isOverdue).toBe(true);
      expect(status.shouldEscalate).toBe(true);

      // Should mark as timed_out
      expect(store.update).toHaveBeenCalledWith('gate-timeout', expect.objectContaining({
        status: 'timed_out',
      }));
    });

    it('does nothing when SLA is in early stage (< 50%)', async () => {
      // Gate created 5 hours ago (< 50% of 24h)
      const createdAt = new Date(Date.now() - 5 * 60 * 60 * 1000);
      const gate = makeGate({
        id: 'gate-early',
        createdAt,
        slaHours: 24,
        reminderSentAt: undefined,
      });

      const status = await manager.checkAndHandleSLA(gate);

      expect(status.shouldRemind).toBe(false);
      expect(status.shouldEscalate).toBe(false);
      expect(status.isOverdue).toBe(false);

      // No notifications, no store updates
      expect(channel.send).not.toHaveBeenCalled();
      expect(store.update).not.toHaveBeenCalled();
    });
  });
});
