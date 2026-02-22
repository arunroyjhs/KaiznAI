import { setup, assign } from 'xstate';

export interface ExperimentMachineContext {
  experimentId: string;
  outcomeId: string;
  launchedAt?: Date;
  concludedAt?: Date;
  killReason?: string;
  failReason?: string;
}

export type ExperimentMachineEvent =
  | { type: 'PORTFOLIO_GATE_APPROVED' }
  | { type: 'PORTFOLIO_GATE_REJECTED' }
  | { type: 'BUILD_STARTED'; agentId: string }
  | { type: 'BUILD_COMPLETED' }
  | { type: 'BUILD_FAILED'; reason: string }
  | { type: 'LAUNCH_GATE_APPROVED' }
  | { type: 'LAUNCH_GATE_REJECTED' }
  | { type: 'EXPERIMENT_LAUNCHED' }
  | { type: 'SIGNIFICANCE_REACHED' }
  | { type: 'KILL_THRESHOLD_HIT'; reason: string }
  | { type: 'CONSTRAINT_VIOLATED'; reason: string }
  | { type: 'ANALYSIS_GATE_APPROVED'; decision: 'ship' | 'scale' | 'iterate' | 'kill' }
  | { type: 'ANALYSIS_GATE_REJECTED' }
  | { type: 'SCALE_GATE_APPROVED' }
  | { type: 'SCALE_GATE_REJECTED' }
  | { type: 'SHIP' }
  | { type: 'KILL'; reason: string };

export const experimentMachine = setup({
  types: {
    context: {} as ExperimentMachineContext,
    events: {} as ExperimentMachineEvent,
  },
  actions: {
    setLaunchedTimestamp: assign({
      launchedAt: () => new Date(),
    }),
    setConcludedTimestamp: assign({
      concludedAt: () => new Date(),
    }),
    setKillReason: assign({
      killReason: ({ event }) => {
        if ('reason' in event) return event.reason;
        return 'Unknown reason';
      },
      concludedAt: () => new Date(),
    }),
    setFailReason: assign({
      failReason: ({ event }) => {
        if ('reason' in event) return event.reason;
        return 'Unknown failure';
      },
      concludedAt: () => new Date(),
    }),
  },
}).createMachine({
  id: 'experiment',
  initial: 'hypothesis',
  context: ({ input }: { input: { experimentId: string; outcomeId: string } }) => ({
    experimentId: input.experimentId,
    outcomeId: input.outcomeId,
  }),
  states: {
    hypothesis: {
      on: {
        PORTFOLIO_GATE_APPROVED: 'awaiting_portfolio_gate',
      },
    },
    awaiting_portfolio_gate: {
      on: {
        BUILD_STARTED: 'building',
        PORTFOLIO_GATE_REJECTED: {
          target: 'killed',
          actions: 'setKillReason',
        },
      },
    },
    building: {
      on: {
        BUILD_COMPLETED: 'awaiting_launch_gate',
        BUILD_FAILED: {
          target: 'failed_build',
          actions: 'setFailReason',
        },
      },
    },
    awaiting_launch_gate: {
      on: {
        LAUNCH_GATE_APPROVED: {
          target: 'running',
          actions: 'setLaunchedTimestamp',
        },
        LAUNCH_GATE_REJECTED: {
          target: 'killed',
          actions: 'setKillReason',
        },
      },
    },
    running: {
      on: {
        SIGNIFICANCE_REACHED: 'measuring',
        KILL_THRESHOLD_HIT: {
          target: 'killed',
          actions: 'setKillReason',
        },
        CONSTRAINT_VIOLATED: {
          target: 'killed',
          actions: 'setKillReason',
        },
      },
    },
    measuring: {
      on: {
        SIGNIFICANCE_REACHED: 'awaiting_analysis_gate',
        KILL_THRESHOLD_HIT: {
          target: 'killed',
          actions: 'setKillReason',
        },
        CONSTRAINT_VIOLATED: {
          target: 'killed',
          actions: 'setKillReason',
        },
      },
    },
    awaiting_analysis_gate: {
      on: {
        ANALYSIS_GATE_APPROVED: [
          {
            target: 'shipped',
            guard: ({ event }) => event.decision === 'ship',
            actions: 'setConcludedTimestamp',
          },
          {
            target: 'scaling',
            guard: ({ event }) => event.decision === 'scale',
          },
          {
            target: 'running',
            guard: ({ event }) => event.decision === 'iterate',
          },
          {
            target: 'killed',
            guard: ({ event }) => event.decision === 'kill',
            actions: 'setKillReason',
          },
        ],
        ANALYSIS_GATE_REJECTED: {
          target: 'killed',
          actions: 'setConcludedTimestamp',
        },
      },
    },
    scaling: {
      on: {
        SCALE_GATE_APPROVED: 'awaiting_scale_gate',
        KILL_THRESHOLD_HIT: {
          target: 'killed',
          actions: 'setKillReason',
        },
      },
    },
    awaiting_scale_gate: {
      on: {
        SHIP: {
          target: 'shipped',
          actions: 'setConcludedTimestamp',
        },
        SCALE_GATE_REJECTED: {
          target: 'killed',
          actions: 'setConcludedTimestamp',
        },
      },
    },
    killed: {
      type: 'final',
    },
    shipped: {
      type: 'final',
    },
    failed_build: {
      type: 'final',
    },
  },
});
