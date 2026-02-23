import { setup, assign } from 'xstate';

export interface OutcomeMachineContext {
  outcomeId: string;
  activatedAt?: Date;
  achievedAt?: Date;
  error?: string;
}

export type OutcomeMachineEvent =
  | { type: 'ACTIVATE' }
  | { type: 'ACHIEVE' }
  | { type: 'ABANDON'; reason: string }
  | { type: 'EXPIRE' };

export const outcomeMachine = setup({
  types: {
    context: {} as OutcomeMachineContext,
    events: {} as OutcomeMachineEvent,
  },
  guards: {
    hasValidSignalConfig: ({ context }) => {
      return !!context.outcomeId;
    },
  },
  actions: {
    setActivatedTimestamp: assign({
      activatedAt: () => new Date(),
    }),
    setAchievedTimestamp: assign({
      achievedAt: () => new Date(),
    }),
  },
}).createMachine({
  id: 'outcome',
  initial: 'draft',
  context: ({ input }: { input: { outcomeId: string } }) => ({
    outcomeId: input.outcomeId,
  }),
  states: {
    draft: {
      on: {
        ACTIVATE: {
          target: 'active',
          guard: 'hasValidSignalConfig',
          actions: 'setActivatedTimestamp',
        },
      },
    },
    active: {
      on: {
        ACHIEVE: {
          target: 'achieved',
          actions: 'setAchievedTimestamp',
        },
        ABANDON: {
          target: 'abandoned',
        },
        EXPIRE: {
          target: 'expired',
        },
      },
    },
    achieved: {
      type: 'final',
    },
    abandoned: {
      type: 'final',
    },
    expired: {
      type: 'final',
    },
  },
});
