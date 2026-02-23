import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { outcomeMachine } from '../state-machine/outcome-machine.js';

function createOutcomeActor(outcomeId: string = 'test-outcome-1') {
  return createActor(outcomeMachine, {
    input: { outcomeId },
  });
}

describe('outcomeMachine', () => {
  describe('initial state', () => {
    it('should start in the draft state', () => {
      const actor = createOutcomeActor();
      actor.start();
      expect(actor.getSnapshot().value).toBe('draft');
      actor.stop();
    });

    it('should initialize context with the provided outcomeId', () => {
      const actor = createOutcomeActor('my-outcome-42');
      actor.start();
      expect(actor.getSnapshot().context.outcomeId).toBe('my-outcome-42');
      actor.stop();
    });

    it('should not have activatedAt set initially', () => {
      const actor = createOutcomeActor();
      actor.start();
      expect(actor.getSnapshot().context.activatedAt).toBeUndefined();
      actor.stop();
    });

    it('should not have achievedAt set initially', () => {
      const actor = createOutcomeActor();
      actor.start();
      expect(actor.getSnapshot().context.achievedAt).toBeUndefined();
      actor.stop();
    });
  });

  describe('draft state', () => {
    it('should transition to active on ACTIVATE when outcomeId is set', () => {
      const actor = createOutcomeActor('valid-id');
      actor.start();
      actor.send({ type: 'ACTIVATE' });
      expect(actor.getSnapshot().value).toBe('active');
      actor.stop();
    });

    it('should not transition to active on ACTIVATE when outcomeId is empty', () => {
      const actor = createOutcomeActor('');
      actor.start();
      actor.send({ type: 'ACTIVATE' });
      expect(actor.getSnapshot().value).toBe('draft');
      actor.stop();
    });

    it('should set activatedAt timestamp on ACTIVATE', () => {
      const actor = createOutcomeActor('valid-id');
      actor.start();
      const before = new Date();
      actor.send({ type: 'ACTIVATE' });
      const after = new Date();
      const activatedAt = actor.getSnapshot().context.activatedAt;
      expect(activatedAt).toBeInstanceOf(Date);
      expect(activatedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(activatedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
      actor.stop();
    });

    it('should ignore ACHIEVE event in draft state', () => {
      const actor = createOutcomeActor();
      actor.start();
      actor.send({ type: 'ACHIEVE' });
      expect(actor.getSnapshot().value).toBe('draft');
      actor.stop();
    });

    it('should ignore ABANDON event in draft state', () => {
      const actor = createOutcomeActor();
      actor.start();
      actor.send({ type: 'ABANDON', reason: 'not needed' });
      expect(actor.getSnapshot().value).toBe('draft');
      actor.stop();
    });

    it('should ignore EXPIRE event in draft state', () => {
      const actor = createOutcomeActor();
      actor.start();
      actor.send({ type: 'EXPIRE' });
      expect(actor.getSnapshot().value).toBe('draft');
      actor.stop();
    });
  });

  describe('active state', () => {
    function createActiveActor() {
      const actor = createOutcomeActor('test-outcome');
      actor.start();
      actor.send({ type: 'ACTIVATE' });
      return actor;
    }

    it('should transition to achieved on ACHIEVE', () => {
      const actor = createActiveActor();
      actor.send({ type: 'ACHIEVE' });
      expect(actor.getSnapshot().value).toBe('achieved');
      actor.stop();
    });

    it('should set achievedAt timestamp on ACHIEVE', () => {
      const actor = createActiveActor();
      const before = new Date();
      actor.send({ type: 'ACHIEVE' });
      const after = new Date();
      const achievedAt = actor.getSnapshot().context.achievedAt;
      expect(achievedAt).toBeInstanceOf(Date);
      expect(achievedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(achievedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
      actor.stop();
    });

    it('should transition to abandoned on ABANDON', () => {
      const actor = createActiveActor();
      actor.send({ type: 'ABANDON', reason: 'no longer relevant' });
      expect(actor.getSnapshot().value).toBe('abandoned');
      actor.stop();
    });

    it('should transition to expired on EXPIRE', () => {
      const actor = createActiveActor();
      actor.send({ type: 'EXPIRE' });
      expect(actor.getSnapshot().value).toBe('expired');
      actor.stop();
    });

    it('should ignore ACTIVATE event in active state', () => {
      const actor = createActiveActor();
      actor.send({ type: 'ACTIVATE' });
      expect(actor.getSnapshot().value).toBe('active');
      actor.stop();
    });
  });

  describe('final states', () => {
    it('achieved state should be final and not accept any transitions', () => {
      const actor = createOutcomeActor('test');
      actor.start();
      actor.send({ type: 'ACTIVATE' });
      actor.send({ type: 'ACHIEVE' });
      expect(actor.getSnapshot().value).toBe('achieved');
      expect(actor.getSnapshot().status).toBe('done');

      // Try sending events to final state - should stay in achieved
      actor.send({ type: 'ACTIVATE' });
      expect(actor.getSnapshot().value).toBe('achieved');
      actor.send({ type: 'ABANDON', reason: 'test' });
      expect(actor.getSnapshot().value).toBe('achieved');
      actor.send({ type: 'EXPIRE' });
      expect(actor.getSnapshot().value).toBe('achieved');
      actor.stop();
    });

    it('abandoned state should be final and not accept any transitions', () => {
      const actor = createOutcomeActor('test');
      actor.start();
      actor.send({ type: 'ACTIVATE' });
      actor.send({ type: 'ABANDON', reason: 'done' });
      expect(actor.getSnapshot().value).toBe('abandoned');
      expect(actor.getSnapshot().status).toBe('done');

      actor.send({ type: 'ACTIVATE' });
      expect(actor.getSnapshot().value).toBe('abandoned');
      actor.send({ type: 'ACHIEVE' });
      expect(actor.getSnapshot().value).toBe('abandoned');
      actor.stop();
    });

    it('expired state should be final and not accept any transitions', () => {
      const actor = createOutcomeActor('test');
      actor.start();
      actor.send({ type: 'ACTIVATE' });
      actor.send({ type: 'EXPIRE' });
      expect(actor.getSnapshot().value).toBe('expired');
      expect(actor.getSnapshot().status).toBe('done');

      actor.send({ type: 'ACTIVATE' });
      expect(actor.getSnapshot().value).toBe('expired');
      actor.send({ type: 'ACHIEVE' });
      expect(actor.getSnapshot().value).toBe('expired');
      actor.stop();
    });
  });

  describe('guard: hasValidSignalConfig', () => {
    it('should allow ACTIVATE when outcomeId is a non-empty string', () => {
      const actor = createOutcomeActor('valid-outcome-id');
      actor.start();
      actor.send({ type: 'ACTIVATE' });
      expect(actor.getSnapshot().value).toBe('active');
      actor.stop();
    });

    it('should prevent ACTIVATE when outcomeId is empty string', () => {
      const actor = createOutcomeActor('');
      actor.start();
      actor.send({ type: 'ACTIVATE' });
      expect(actor.getSnapshot().value).toBe('draft');
      actor.stop();
    });
  });

  describe('context preservation', () => {
    it('should preserve outcomeId across transitions', () => {
      const actor = createOutcomeActor('my-persistent-id');
      actor.start();
      expect(actor.getSnapshot().context.outcomeId).toBe('my-persistent-id');
      actor.send({ type: 'ACTIVATE' });
      expect(actor.getSnapshot().context.outcomeId).toBe('my-persistent-id');
      actor.send({ type: 'ACHIEVE' });
      expect(actor.getSnapshot().context.outcomeId).toBe('my-persistent-id');
      actor.stop();
    });

    it('should preserve activatedAt after further transitions', () => {
      const actor = createOutcomeActor('test');
      actor.start();
      actor.send({ type: 'ACTIVATE' });
      const activatedAt = actor.getSnapshot().context.activatedAt;
      actor.send({ type: 'ACHIEVE' });
      expect(actor.getSnapshot().context.activatedAt).toEqual(activatedAt);
      actor.stop();
    });
  });

  describe('machine metadata', () => {
    it('should have the id "outcome"', () => {
      expect(outcomeMachine.id).toBe('outcome');
    });
  });
});
