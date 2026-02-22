export class OutcomeRuntimeError extends Error {
  constructor(
    public code: string,
    message: string,
    public context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'OutcomeRuntimeError';
  }
}

export class SignalFetchError extends OutcomeRuntimeError {
  constructor(source: string, message: string, context?: Record<string, unknown>) {
    super('SIGNAL_FETCH_FAILED', `Signal fetch from ${source} failed: ${message}`, context);
    this.name = 'SignalFetchError';
  }
}

export class GateTimeoutError extends OutcomeRuntimeError {
  constructor(gateId: string, assignedTo: string) {
    super('GATE_TIMEOUT', `Gate ${gateId} timed out waiting for ${assignedTo}`, {
      gateId,
      assignedTo,
    });
    this.name = 'GateTimeoutError';
  }
}

export class LLMError extends OutcomeRuntimeError {
  constructor(provider: string, message: string, context?: Record<string, unknown>) {
    super('LLM_ERROR', `LLM error from ${provider}: ${message}`, context);
    this.name = 'LLMError';
  }
}

export class ConstraintViolationError extends OutcomeRuntimeError {
  constructor(
    experimentId: string,
    constraint: string,
    value: number,
    limit: number,
  ) {
    super('CONSTRAINT_VIOLATED', `Constraint violated: ${constraint} at ${value} (limit: ${limit})`, {
      experimentId,
      constraint,
      value,
      limit,
    });
    this.name = 'ConstraintViolationError';
  }
}

export class ConfigValidationError extends OutcomeRuntimeError {
  constructor(message: string, errors: Record<string, string[]>) {
    super('CONFIG_VALIDATION_FAILED', message, { errors });
    this.name = 'ConfigValidationError';
  }
}

export class ExperimentKilledError extends OutcomeRuntimeError {
  constructor(experimentId: string, signal: string, value: number, threshold: number) {
    super('EXPERIMENT_KILLED', `Experiment ${experimentId} killed: ${signal} crossed kill threshold`, {
      experimentId,
      signal,
      value,
      threshold,
    });
    this.name = 'ExperimentKilledError';
  }
}
