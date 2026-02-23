import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { experimentMachine } from '../state-machine/experiment-machine.js';

function createExperimentActor(
  experimentId: string = 'exp-1',
  outcomeId: string = 'outcome-1',
) {
  return createActor(experimentMachine, {
    input: { experimentId, outcomeId },
  });
}

/** Helper to advance actor through the happy path to a given state */
function advanceTo(
  state:
    | 'hypothesis'
    | 'awaiting_portfolio_gate'
    | 'building'
    | 'awaiting_launch_gate'
    | 'running'
    | 'measuring'
    | 'awaiting_analysis_gate'
    | 'scaling'
    | 'awaiting_scale_gate',
) {
  const actor = createExperimentActor();
  actor.start();

  const steps: Array<{ type: string; [key: string]: unknown }> = [
    { type: 'PORTFOLIO_GATE_APPROVED' },
    { type: 'BUILD_STARTED', agentId: 'agent-1' },
    { type: 'BUILD_COMPLETED' },
    { type: 'LAUNCH_GATE_APPROVED' },
    { type: 'SIGNIFICANCE_REACHED' },
    { type: 'SIGNIFICANCE_REACHED' },
    // Now in awaiting_analysis_gate
  ];

  const stateOrder = [
    'hypothesis',
    'awaiting_portfolio_gate',
    'building',
    'awaiting_launch_gate',
    'running',
    'measuring',
    'awaiting_analysis_gate',
  ];

  const targetIndex = stateOrder.indexOf(state);
  if (targetIndex >= 0) {
    for (let i = 0; i < targetIndex; i++) {
      actor.send(steps[i] as any);
    }
    return actor;
  }

  // For scaling and awaiting_scale_gate, go through the full path
  for (let i = 0; i < steps.length; i++) {
    actor.send(steps[i] as any);
  }

  if (state === 'scaling') {
    actor.send({ type: 'ANALYSIS_GATE_APPROVED', decision: 'scale' as const });
    return actor;
  }

  if (state === 'awaiting_scale_gate') {
    actor.send({ type: 'ANALYSIS_GATE_APPROVED', decision: 'scale' as const });
    actor.send({ type: 'SCALE_GATE_APPROVED' });
    return actor;
  }

  return actor;
}

describe('experimentMachine', () => {
  describe('initial state', () => {
    it('should start in the hypothesis state', () => {
      const actor = createExperimentActor();
      actor.start();
      expect(actor.getSnapshot().value).toBe('hypothesis');
      actor.stop();
    });

    it('should initialize context with experimentId and outcomeId', () => {
      const actor = createExperimentActor('exp-42', 'outcome-7');
      actor.start();
      const ctx = actor.getSnapshot().context;
      expect(ctx.experimentId).toBe('exp-42');
      expect(ctx.outcomeId).toBe('outcome-7');
      actor.stop();
    });

    it('should not have timestamps set initially', () => {
      const actor = createExperimentActor();
      actor.start();
      const ctx = actor.getSnapshot().context;
      expect(ctx.launchedAt).toBeUndefined();
      expect(ctx.concludedAt).toBeUndefined();
      expect(ctx.killReason).toBeUndefined();
      expect(ctx.failReason).toBeUndefined();
      actor.stop();
    });
  });

  describe('hypothesis -> awaiting_portfolio_gate', () => {
    it('should transition on PORTFOLIO_GATE_APPROVED', () => {
      const actor = createExperimentActor();
      actor.start();
      actor.send({ type: 'PORTFOLIO_GATE_APPROVED' });
      expect(actor.getSnapshot().value).toBe('awaiting_portfolio_gate');
      actor.stop();
    });
  });

  describe('awaiting_portfolio_gate', () => {
    it('should transition to building on BUILD_STARTED', () => {
      const actor = advanceTo('awaiting_portfolio_gate');
      actor.send({ type: 'BUILD_STARTED', agentId: 'agent-1' });
      expect(actor.getSnapshot().value).toBe('building');
      actor.stop();
    });

    it('should transition to killed on PORTFOLIO_GATE_REJECTED', () => {
      const actor = advanceTo('awaiting_portfolio_gate');
      actor.send({ type: 'PORTFOLIO_GATE_REJECTED' });
      expect(actor.getSnapshot().value).toBe('killed');
      actor.stop();
    });

    it('should set killReason on PORTFOLIO_GATE_REJECTED', () => {
      const actor = advanceTo('awaiting_portfolio_gate');
      actor.send({ type: 'PORTFOLIO_GATE_REJECTED' });
      // PORTFOLIO_GATE_REJECTED does not have 'reason' in event type,
      // so setKillReason assigns 'Unknown reason'
      expect(actor.getSnapshot().context.killReason).toBeDefined();
      actor.stop();
    });
  });

  describe('building', () => {
    it('should transition to awaiting_launch_gate on BUILD_COMPLETED', () => {
      const actor = advanceTo('building');
      actor.send({ type: 'BUILD_COMPLETED' });
      expect(actor.getSnapshot().value).toBe('awaiting_launch_gate');
      actor.stop();
    });

    it('should transition to failed_build on BUILD_FAILED', () => {
      const actor = advanceTo('building');
      actor.send({ type: 'BUILD_FAILED', reason: 'Compilation error' });
      expect(actor.getSnapshot().value).toBe('failed_build');
      actor.stop();
    });

    it('should set failReason on BUILD_FAILED', () => {
      const actor = advanceTo('building');
      actor.send({ type: 'BUILD_FAILED', reason: 'Compilation error' });
      expect(actor.getSnapshot().context.failReason).toBe('Compilation error');
      actor.stop();
    });

    it('should set concludedAt on BUILD_FAILED', () => {
      const actor = advanceTo('building');
      actor.send({ type: 'BUILD_FAILED', reason: 'Compilation error' });
      expect(actor.getSnapshot().context.concludedAt).toBeInstanceOf(Date);
      actor.stop();
    });

    it('failed_build should be a final state', () => {
      const actor = advanceTo('building');
      actor.send({ type: 'BUILD_FAILED', reason: 'error' });
      expect(actor.getSnapshot().value).toBe('failed_build');
      expect(actor.getSnapshot().status).toBe('done');
      actor.stop();
    });
  });

  describe('awaiting_launch_gate', () => {
    it('should transition to running on LAUNCH_GATE_APPROVED', () => {
      const actor = advanceTo('awaiting_launch_gate');
      actor.send({ type: 'LAUNCH_GATE_APPROVED' });
      expect(actor.getSnapshot().value).toBe('running');
      actor.stop();
    });

    it('should set launchedAt on LAUNCH_GATE_APPROVED', () => {
      const actor = advanceTo('awaiting_launch_gate');
      const before = new Date();
      actor.send({ type: 'LAUNCH_GATE_APPROVED' });
      const after = new Date();
      const launchedAt = actor.getSnapshot().context.launchedAt;
      expect(launchedAt).toBeInstanceOf(Date);
      expect(launchedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(launchedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
      actor.stop();
    });

    it('should transition to killed on LAUNCH_GATE_REJECTED', () => {
      const actor = advanceTo('awaiting_launch_gate');
      actor.send({ type: 'LAUNCH_GATE_REJECTED' });
      expect(actor.getSnapshot().value).toBe('killed');
      actor.stop();
    });
  });

  describe('running', () => {
    it('should transition to measuring on SIGNIFICANCE_REACHED', () => {
      const actor = advanceTo('running');
      actor.send({ type: 'SIGNIFICANCE_REACHED' });
      expect(actor.getSnapshot().value).toBe('measuring');
      actor.stop();
    });

    it('should transition to killed on KILL_THRESHOLD_HIT', () => {
      const actor = advanceTo('running');
      actor.send({ type: 'KILL_THRESHOLD_HIT', reason: 'bounce rate too high' });
      expect(actor.getSnapshot().value).toBe('killed');
      actor.stop();
    });

    it('should set killReason on KILL_THRESHOLD_HIT', () => {
      const actor = advanceTo('running');
      actor.send({ type: 'KILL_THRESHOLD_HIT', reason: 'bounce rate too high' });
      expect(actor.getSnapshot().context.killReason).toBe('bounce rate too high');
      actor.stop();
    });

    it('should transition to killed on CONSTRAINT_VIOLATED', () => {
      const actor = advanceTo('running');
      actor.send({ type: 'CONSTRAINT_VIOLATED', reason: 'error rate exceeded' });
      expect(actor.getSnapshot().value).toBe('killed');
      actor.stop();
    });

    it('should set killReason on CONSTRAINT_VIOLATED', () => {
      const actor = advanceTo('running');
      actor.send({ type: 'CONSTRAINT_VIOLATED', reason: 'error rate exceeded' });
      expect(actor.getSnapshot().context.killReason).toBe('error rate exceeded');
      actor.stop();
    });
  });

  describe('measuring', () => {
    it('should transition to awaiting_analysis_gate on SIGNIFICANCE_REACHED', () => {
      const actor = advanceTo('measuring');
      actor.send({ type: 'SIGNIFICANCE_REACHED' });
      expect(actor.getSnapshot().value).toBe('awaiting_analysis_gate');
      actor.stop();
    });

    it('should transition to killed on KILL_THRESHOLD_HIT', () => {
      const actor = advanceTo('measuring');
      actor.send({ type: 'KILL_THRESHOLD_HIT', reason: 'metrics degraded' });
      expect(actor.getSnapshot().value).toBe('killed');
      expect(actor.getSnapshot().context.killReason).toBe('metrics degraded');
      actor.stop();
    });

    it('should transition to killed on CONSTRAINT_VIOLATED', () => {
      const actor = advanceTo('measuring');
      actor.send({ type: 'CONSTRAINT_VIOLATED', reason: 'latency exceeded' });
      expect(actor.getSnapshot().value).toBe('killed');
      expect(actor.getSnapshot().context.killReason).toBe('latency exceeded');
      actor.stop();
    });
  });

  describe('awaiting_analysis_gate', () => {
    it('should transition to shipped on ANALYSIS_GATE_APPROVED with decision=ship', () => {
      const actor = advanceTo('awaiting_analysis_gate');
      actor.send({ type: 'ANALYSIS_GATE_APPROVED', decision: 'ship' as const });
      expect(actor.getSnapshot().value).toBe('shipped');
      actor.stop();
    });

    it('should set concludedAt on ship decision', () => {
      const actor = advanceTo('awaiting_analysis_gate');
      actor.send({ type: 'ANALYSIS_GATE_APPROVED', decision: 'ship' as const });
      expect(actor.getSnapshot().context.concludedAt).toBeInstanceOf(Date);
      actor.stop();
    });

    it('should transition to scaling on ANALYSIS_GATE_APPROVED with decision=scale', () => {
      const actor = advanceTo('awaiting_analysis_gate');
      actor.send({ type: 'ANALYSIS_GATE_APPROVED', decision: 'scale' as const });
      expect(actor.getSnapshot().value).toBe('scaling');
      actor.stop();
    });

    it('should transition to running on ANALYSIS_GATE_APPROVED with decision=iterate', () => {
      const actor = advanceTo('awaiting_analysis_gate');
      actor.send({ type: 'ANALYSIS_GATE_APPROVED', decision: 'iterate' as const });
      expect(actor.getSnapshot().value).toBe('running');
      actor.stop();
    });

    it('should transition to killed on ANALYSIS_GATE_APPROVED with decision=kill', () => {
      const actor = advanceTo('awaiting_analysis_gate');
      actor.send({ type: 'ANALYSIS_GATE_APPROVED', decision: 'kill' as const });
      expect(actor.getSnapshot().value).toBe('killed');
      actor.stop();
    });

    it('should transition to killed on ANALYSIS_GATE_REJECTED', () => {
      const actor = advanceTo('awaiting_analysis_gate');
      actor.send({ type: 'ANALYSIS_GATE_REJECTED' });
      expect(actor.getSnapshot().value).toBe('killed');
      actor.stop();
    });

    it('should set concludedAt on ANALYSIS_GATE_REJECTED', () => {
      const actor = advanceTo('awaiting_analysis_gate');
      actor.send({ type: 'ANALYSIS_GATE_REJECTED' });
      expect(actor.getSnapshot().context.concludedAt).toBeInstanceOf(Date);
      actor.stop();
    });
  });

  describe('scaling', () => {
    it('should transition to awaiting_scale_gate on SCALE_GATE_APPROVED', () => {
      const actor = advanceTo('scaling');
      actor.send({ type: 'SCALE_GATE_APPROVED' });
      expect(actor.getSnapshot().value).toBe('awaiting_scale_gate');
      actor.stop();
    });

    it('should transition to killed on KILL_THRESHOLD_HIT', () => {
      const actor = advanceTo('scaling');
      actor.send({ type: 'KILL_THRESHOLD_HIT', reason: 'scaling failed' });
      expect(actor.getSnapshot().value).toBe('killed');
      expect(actor.getSnapshot().context.killReason).toBe('scaling failed');
      actor.stop();
    });
  });

  describe('awaiting_scale_gate', () => {
    it('should transition to shipped on SHIP', () => {
      const actor = advanceTo('awaiting_scale_gate');
      actor.send({ type: 'SHIP' });
      expect(actor.getSnapshot().value).toBe('shipped');
      actor.stop();
    });

    it('should set concludedAt on SHIP', () => {
      const actor = advanceTo('awaiting_scale_gate');
      actor.send({ type: 'SHIP' });
      expect(actor.getSnapshot().context.concludedAt).toBeInstanceOf(Date);
      actor.stop();
    });

    it('should transition to killed on SCALE_GATE_REJECTED', () => {
      const actor = advanceTo('awaiting_scale_gate');
      actor.send({ type: 'SCALE_GATE_REJECTED' });
      expect(actor.getSnapshot().value).toBe('killed');
      actor.stop();
    });

    it('should set concludedAt on SCALE_GATE_REJECTED', () => {
      const actor = advanceTo('awaiting_scale_gate');
      actor.send({ type: 'SCALE_GATE_REJECTED' });
      expect(actor.getSnapshot().context.concludedAt).toBeInstanceOf(Date);
      actor.stop();
    });
  });

  describe('final states', () => {
    it('killed should be a final state', () => {
      const actor = advanceTo('running');
      actor.send({ type: 'KILL_THRESHOLD_HIT', reason: 'done' });
      expect(actor.getSnapshot().value).toBe('killed');
      expect(actor.getSnapshot().status).toBe('done');
      actor.stop();
    });

    it('shipped should be a final state', () => {
      const actor = advanceTo('awaiting_analysis_gate');
      actor.send({ type: 'ANALYSIS_GATE_APPROVED', decision: 'ship' as const });
      expect(actor.getSnapshot().value).toBe('shipped');
      expect(actor.getSnapshot().status).toBe('done');
      actor.stop();
    });

    it('failed_build should be a final state', () => {
      const actor = advanceTo('building');
      actor.send({ type: 'BUILD_FAILED', reason: 'error' });
      expect(actor.getSnapshot().value).toBe('failed_build');
      expect(actor.getSnapshot().status).toBe('done');
      actor.stop();
    });

    it('should not accept transitions from killed state', () => {
      const actor = advanceTo('running');
      actor.send({ type: 'KILL_THRESHOLD_HIT', reason: 'done' });
      actor.send({ type: 'SIGNIFICANCE_REACHED' });
      expect(actor.getSnapshot().value).toBe('killed');
      actor.stop();
    });

    it('should not accept transitions from shipped state', () => {
      const actor = advanceTo('awaiting_analysis_gate');
      actor.send({ type: 'ANALYSIS_GATE_APPROVED', decision: 'ship' as const });
      actor.send({ type: 'KILL_THRESHOLD_HIT', reason: 'too late' });
      expect(actor.getSnapshot().value).toBe('shipped');
      actor.stop();
    });
  });

  describe('full lifecycle: happy path to shipped via analysis gate', () => {
    it('should complete the full lifecycle from hypothesis to shipped', () => {
      const actor = createExperimentActor('exp-lifecycle', 'outcome-lifecycle');
      actor.start();

      expect(actor.getSnapshot().value).toBe('hypothesis');

      actor.send({ type: 'PORTFOLIO_GATE_APPROVED' });
      expect(actor.getSnapshot().value).toBe('awaiting_portfolio_gate');

      actor.send({ type: 'BUILD_STARTED', agentId: 'agent-1' });
      expect(actor.getSnapshot().value).toBe('building');

      actor.send({ type: 'BUILD_COMPLETED' });
      expect(actor.getSnapshot().value).toBe('awaiting_launch_gate');

      actor.send({ type: 'LAUNCH_GATE_APPROVED' });
      expect(actor.getSnapshot().value).toBe('running');
      expect(actor.getSnapshot().context.launchedAt).toBeInstanceOf(Date);

      actor.send({ type: 'SIGNIFICANCE_REACHED' });
      expect(actor.getSnapshot().value).toBe('measuring');

      actor.send({ type: 'SIGNIFICANCE_REACHED' });
      expect(actor.getSnapshot().value).toBe('awaiting_analysis_gate');

      actor.send({ type: 'ANALYSIS_GATE_APPROVED', decision: 'ship' as const });
      expect(actor.getSnapshot().value).toBe('shipped');
      expect(actor.getSnapshot().context.concludedAt).toBeInstanceOf(Date);
      expect(actor.getSnapshot().status).toBe('done');

      actor.stop();
    });
  });

  describe('full lifecycle: happy path to shipped via scaling', () => {
    it('should complete the full lifecycle from hypothesis to shipped via scaling', () => {
      const actor = createExperimentActor('exp-scale', 'outcome-scale');
      actor.start();

      actor.send({ type: 'PORTFOLIO_GATE_APPROVED' });
      actor.send({ type: 'BUILD_STARTED', agentId: 'agent-1' });
      actor.send({ type: 'BUILD_COMPLETED' });
      actor.send({ type: 'LAUNCH_GATE_APPROVED' });
      actor.send({ type: 'SIGNIFICANCE_REACHED' });
      actor.send({ type: 'SIGNIFICANCE_REACHED' });

      expect(actor.getSnapshot().value).toBe('awaiting_analysis_gate');

      actor.send({ type: 'ANALYSIS_GATE_APPROVED', decision: 'scale' as const });
      expect(actor.getSnapshot().value).toBe('scaling');

      actor.send({ type: 'SCALE_GATE_APPROVED' });
      expect(actor.getSnapshot().value).toBe('awaiting_scale_gate');

      actor.send({ type: 'SHIP' });
      expect(actor.getSnapshot().value).toBe('shipped');
      expect(actor.getSnapshot().status).toBe('done');

      actor.stop();
    });
  });

  describe('iterate loop', () => {
    it('should allow iterating back to running and completing', () => {
      const actor = advanceTo('awaiting_analysis_gate');

      actor.send({ type: 'ANALYSIS_GATE_APPROVED', decision: 'iterate' as const });
      expect(actor.getSnapshot().value).toBe('running');

      // Go through the cycle again
      actor.send({ type: 'SIGNIFICANCE_REACHED' });
      expect(actor.getSnapshot().value).toBe('measuring');

      actor.send({ type: 'SIGNIFICANCE_REACHED' });
      expect(actor.getSnapshot().value).toBe('awaiting_analysis_gate');

      // This time ship
      actor.send({ type: 'ANALYSIS_GATE_APPROVED', decision: 'ship' as const });
      expect(actor.getSnapshot().value).toBe('shipped');

      actor.stop();
    });
  });

  describe('context preservation', () => {
    it('should preserve experimentId and outcomeId across transitions', () => {
      const actor = createExperimentActor('exp-ctx', 'out-ctx');
      actor.start();
      actor.send({ type: 'PORTFOLIO_GATE_APPROVED' });
      actor.send({ type: 'BUILD_STARTED', agentId: 'agent-1' });

      const ctx = actor.getSnapshot().context;
      expect(ctx.experimentId).toBe('exp-ctx');
      expect(ctx.outcomeId).toBe('out-ctx');
      actor.stop();
    });
  });

  describe('machine metadata', () => {
    it('should have the id "experiment"', () => {
      expect(experimentMachine.id).toBe('experiment');
    });
  });
});
