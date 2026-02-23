import { describe, it, expect } from 'vitest';
import { SLAMonitor } from '../sla-monitor.js';

describe('SLAMonitor', () => {
  const monitor = new SLAMonitor();

  // -----------------------------------------------------------------------
  // checkSLA
  // -----------------------------------------------------------------------
  describe('checkSLA', () => {
    it('early stage (0-49%): shouldRemind=false, shouldEscalate=false', () => {
      // Gate created 5 hours ago with 24h SLA (~21%)
      const createdAt = new Date(Date.now() - 5 * 60 * 60 * 1000);

      const status = monitor.checkSLA('gate-1', 'user-1', 24, createdAt);

      expect(status.gateId).toBe('gate-1');
      expect(status.assignedTo).toBe('user-1');
      expect(status.slaHours).toBe(24);
      expect(status.percentUsed).toBeLessThan(50);
      expect(status.isOverdue).toBe(false);
      expect(status.shouldRemind).toBe(false);
      expect(status.shouldEscalate).toBe(false);
    });

    it('at 0% elapsed: no remind, no escalate', () => {
      const createdAt = new Date(); // just created

      const status = monitor.checkSLA('gate-fresh', 'user-1', 24, createdAt);

      expect(status.percentUsed).toBeLessThanOrEqual(1); // near 0
      expect(status.isOverdue).toBe(false);
      expect(status.shouldRemind).toBe(false);
      expect(status.shouldEscalate).toBe(false);
    });

    it('at 50%+ without prior reminder: shouldRemind=true', () => {
      // Gate created 13 hours ago with 24h SLA (~54%)
      const createdAt = new Date(Date.now() - 13 * 60 * 60 * 1000);

      const status = monitor.checkSLA('gate-2', 'user-1', 24, createdAt);

      expect(status.percentUsed).toBeGreaterThanOrEqual(50);
      expect(status.isOverdue).toBe(false);
      expect(status.shouldRemind).toBe(true);
      expect(status.shouldEscalate).toBe(false);
    });

    it('at 50%+ with prior reminder: shouldRemind=false', () => {
      // Gate created 13 hours ago with 24h SLA (~54%), reminder already sent
      const createdAt = new Date(Date.now() - 13 * 60 * 60 * 1000);
      const reminderSentAt = new Date(Date.now() - 1 * 60 * 60 * 1000);

      const status = monitor.checkSLA('gate-3', 'user-1', 24, createdAt, reminderSentAt);

      expect(status.percentUsed).toBeGreaterThanOrEqual(50);
      expect(status.isOverdue).toBe(false);
      expect(status.shouldRemind).toBe(false);
      expect(status.shouldEscalate).toBe(false);
    });

    it('overdue: isOverdue=true, shouldEscalate=true', () => {
      // Gate created 25 hours ago with 24h SLA (>100%)
      const createdAt = new Date(Date.now() - 25 * 60 * 60 * 1000);

      const status = monitor.checkSLA('gate-4', 'user-1', 24, createdAt);

      expect(status.percentUsed).toBeGreaterThan(100);
      expect(status.isOverdue).toBe(true);
      expect(status.shouldEscalate).toBe(true);
    });

    it('overdue: shouldRemind=false even without prior reminder', () => {
      // Even though no reminder was sent, once overdue we do not set shouldRemind
      const createdAt = new Date(Date.now() - 25 * 60 * 60 * 1000);

      const status = monitor.checkSLA('gate-5', 'user-1', 24, createdAt);

      expect(status.isOverdue).toBe(true);
      expect(status.shouldRemind).toBe(false);
    });

    it('exactly at SLA boundary: isOverdue=true', () => {
      // Gate created exactly 24 hours ago with 24h SLA
      const createdAt = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const status = monitor.checkSLA('gate-boundary', 'user-1', 24, createdAt);

      expect(status.isOverdue).toBe(true);
      expect(status.shouldEscalate).toBe(true);
    });

    it('returns correct hoursElapsed value', () => {
      // Gate created 10 hours ago
      const createdAt = new Date(Date.now() - 10 * 60 * 60 * 1000);

      const status = monitor.checkSLA('gate-hrs', 'user-1', 24, createdAt);

      // hoursElapsed is rounded to 1 decimal
      expect(status.hoursElapsed).toBeCloseTo(10, 0);
    });
  });

  // -----------------------------------------------------------------------
  // getEscalationTarget
  // -----------------------------------------------------------------------
  describe('getEscalationTarget', () => {
    it('returns next person in chain after current assignee', () => {
      const chain = ['user-a', 'user-b', 'user-c'];

      expect(monitor.getEscalationTarget(chain, 'user-a')).toBe('user-b');
      expect(monitor.getEscalationTarget(chain, 'user-b')).toBe('user-c');
    });

    it('returns first person in chain if current assignee is not in chain', () => {
      const chain = ['user-a', 'user-b', 'user-c'];

      expect(monitor.getEscalationTarget(chain, 'user-x')).toBe('user-a');
    });

    it('returns undefined if current assignee is last in chain', () => {
      const chain = ['user-a', 'user-b', 'user-c'];

      expect(monitor.getEscalationTarget(chain, 'user-c')).toBeUndefined();
    });

    it('returns undefined for empty chain when current assignee is not in it', () => {
      const chain: string[] = [];

      expect(monitor.getEscalationTarget(chain, 'user-x')).toBeUndefined();
    });

    it('returns undefined for single-item chain when current is that item', () => {
      const chain = ['user-only'];

      expect(monitor.getEscalationTarget(chain, 'user-only')).toBeUndefined();
    });
  });
});
