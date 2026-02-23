import { describe, it, expect } from 'vitest';
import {
  OutcomeRuntimeError,
  SignalFetchError,
  GateTimeoutError,
  LLMError,
  ConstraintViolationError,
  ConfigValidationError,
  ExperimentKilledError,
} from '../errors.js';

describe('OutcomeRuntimeError', () => {
  it('should extend Error', () => {
    const error = new OutcomeRuntimeError('TEST_CODE', 'Test message');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(OutcomeRuntimeError);
  });

  it('should set the name property correctly', () => {
    const error = new OutcomeRuntimeError('TEST_CODE', 'Test message');
    expect(error.name).toBe('OutcomeRuntimeError');
  });

  it('should set the code property correctly', () => {
    const error = new OutcomeRuntimeError('MY_CODE', 'Something went wrong');
    expect(error.code).toBe('MY_CODE');
  });

  it('should set the message property correctly', () => {
    const error = new OutcomeRuntimeError('MY_CODE', 'Something went wrong');
    expect(error.message).toBe('Something went wrong');
  });

  it('should set context when provided', () => {
    const ctx = { key: 'value', num: 42 };
    const error = new OutcomeRuntimeError('CODE', 'msg', ctx);
    expect(error.context).toEqual(ctx);
  });

  it('should have undefined context when not provided', () => {
    const error = new OutcomeRuntimeError('CODE', 'msg');
    expect(error.context).toBeUndefined();
  });

  it('should have a stack trace', () => {
    const error = new OutcomeRuntimeError('CODE', 'msg');
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('OutcomeRuntimeError');
  });
});

describe('SignalFetchError', () => {
  it('should extend OutcomeRuntimeError', () => {
    const error = new SignalFetchError('amplitude', 'connection timeout');
    expect(error).toBeInstanceOf(OutcomeRuntimeError);
    expect(error).toBeInstanceOf(Error);
  });

  it('should set the name property correctly', () => {
    const error = new SignalFetchError('amplitude', 'connection timeout');
    expect(error.name).toBe('SignalFetchError');
  });

  it('should set the code to SIGNAL_FETCH_FAILED', () => {
    const error = new SignalFetchError('amplitude', 'connection timeout');
    expect(error.code).toBe('SIGNAL_FETCH_FAILED');
  });

  it('should format the message with source and details', () => {
    const error = new SignalFetchError('amplitude', 'connection timeout');
    expect(error.message).toBe('Signal fetch from amplitude failed: connection timeout');
  });

  it('should pass through context', () => {
    const ctx = { endpoint: '/api/metrics', statusCode: 500 };
    const error = new SignalFetchError('posthog', 'server error', ctx);
    expect(error.context).toEqual(ctx);
  });

  it('should have undefined context when not provided', () => {
    const error = new SignalFetchError('posthog', 'server error');
    expect(error.context).toBeUndefined();
  });
});

describe('GateTimeoutError', () => {
  it('should extend OutcomeRuntimeError', () => {
    const error = new GateTimeoutError('gate-123', 'john@example.com');
    expect(error).toBeInstanceOf(OutcomeRuntimeError);
    expect(error).toBeInstanceOf(Error);
  });

  it('should set the name property correctly', () => {
    const error = new GateTimeoutError('gate-123', 'john@example.com');
    expect(error.name).toBe('GateTimeoutError');
  });

  it('should set the code to GATE_TIMEOUT', () => {
    const error = new GateTimeoutError('gate-123', 'john@example.com');
    expect(error.code).toBe('GATE_TIMEOUT');
  });

  it('should format the message with gateId and assignedTo', () => {
    const error = new GateTimeoutError('gate-456', 'product-lead');
    expect(error.message).toBe('Gate gate-456 timed out waiting for product-lead');
  });

  it('should set context with gateId and assignedTo', () => {
    const error = new GateTimeoutError('gate-789', 'manager@co.com');
    expect(error.context).toEqual({
      gateId: 'gate-789',
      assignedTo: 'manager@co.com',
    });
  });
});

describe('LLMError', () => {
  it('should extend OutcomeRuntimeError', () => {
    const error = new LLMError('anthropic', 'rate limit exceeded');
    expect(error).toBeInstanceOf(OutcomeRuntimeError);
    expect(error).toBeInstanceOf(Error);
  });

  it('should set the name property correctly', () => {
    const error = new LLMError('anthropic', 'rate limit exceeded');
    expect(error.name).toBe('LLMError');
  });

  it('should set the code to LLM_ERROR', () => {
    const error = new LLMError('openai', 'invalid API key');
    expect(error.code).toBe('LLM_ERROR');
  });

  it('should format the message with provider and details', () => {
    const error = new LLMError('openai', 'invalid API key');
    expect(error.message).toBe('LLM error from openai: invalid API key');
  });

  it('should pass through context', () => {
    const ctx = { model: 'gpt-4', tokens: 8192 };
    const error = new LLMError('openai', 'context too long', ctx);
    expect(error.context).toEqual(ctx);
  });

  it('should have undefined context when not provided', () => {
    const error = new LLMError('anthropic', 'rate limit');
    expect(error.context).toBeUndefined();
  });
});

describe('ConstraintViolationError', () => {
  it('should extend OutcomeRuntimeError', () => {
    const error = new ConstraintViolationError('exp-1', 'error_rate', 0.15, 0.1);
    expect(error).toBeInstanceOf(OutcomeRuntimeError);
    expect(error).toBeInstanceOf(Error);
  });

  it('should set the name property correctly', () => {
    const error = new ConstraintViolationError('exp-1', 'error_rate', 0.15, 0.1);
    expect(error.name).toBe('ConstraintViolationError');
  });

  it('should set the code to CONSTRAINT_VIOLATED', () => {
    const error = new ConstraintViolationError('exp-1', 'error_rate', 0.15, 0.1);
    expect(error.code).toBe('CONSTRAINT_VIOLATED');
  });

  it('should format the message with constraint, value, and limit', () => {
    const error = new ConstraintViolationError('exp-1', 'error_rate', 0.15, 0.1);
    expect(error.message).toBe('Constraint violated: error_rate at 0.15 (limit: 0.1)');
  });

  it('should set context with all parameters', () => {
    const error = new ConstraintViolationError('exp-42', 'latency_p99', 500, 200);
    expect(error.context).toEqual({
      experimentId: 'exp-42',
      constraint: 'latency_p99',
      value: 500,
      limit: 200,
    });
  });
});

describe('ConfigValidationError', () => {
  it('should extend OutcomeRuntimeError', () => {
    const error = new ConfigValidationError('Invalid config', { field: ['required'] });
    expect(error).toBeInstanceOf(OutcomeRuntimeError);
    expect(error).toBeInstanceOf(Error);
  });

  it('should set the name property correctly', () => {
    const error = new ConfigValidationError('Invalid config', { field: ['required'] });
    expect(error.name).toBe('ConfigValidationError');
  });

  it('should set the code to CONFIG_VALIDATION_FAILED', () => {
    const error = new ConfigValidationError('Bad config', {});
    expect(error.code).toBe('CONFIG_VALIDATION_FAILED');
  });

  it('should set the message correctly', () => {
    const error = new ConfigValidationError('Missing required fields', {});
    expect(error.message).toBe('Missing required fields');
  });

  it('should set context with errors record', () => {
    const errors = {
      'outcomes.0.id': ['ID must be URL-safe lowercase with hyphens'],
      'outcomes.0.signal.method': ['Invalid enum value'],
    };
    const error = new ConfigValidationError('Validation failed', errors);
    expect(error.context).toEqual({ errors });
  });

  it('should handle empty errors record', () => {
    const error = new ConfigValidationError('Some error', {});
    expect(error.context).toEqual({ errors: {} });
  });

  it('should handle multiple errors per field', () => {
    const errors = {
      'outcomes.0.target.to': ['Expected number, received string', 'Required'],
    };
    const error = new ConfigValidationError('Validation failed', errors);
    expect(error.context).toEqual({ errors });
  });
});

describe('ExperimentKilledError', () => {
  it('should extend OutcomeRuntimeError', () => {
    const error = new ExperimentKilledError('exp-1', 'bounce_rate', 0.85, 0.7);
    expect(error).toBeInstanceOf(OutcomeRuntimeError);
    expect(error).toBeInstanceOf(Error);
  });

  it('should set the name property correctly', () => {
    const error = new ExperimentKilledError('exp-1', 'bounce_rate', 0.85, 0.7);
    expect(error.name).toBe('ExperimentKilledError');
  });

  it('should set the code to EXPERIMENT_KILLED', () => {
    const error = new ExperimentKilledError('exp-1', 'bounce_rate', 0.85, 0.7);
    expect(error.code).toBe('EXPERIMENT_KILLED');
  });

  it('should format the message with experimentId and signal', () => {
    const error = new ExperimentKilledError('exp-42', 'error_rate', 0.2, 0.05);
    expect(error.message).toBe('Experiment exp-42 killed: error_rate crossed kill threshold');
  });

  it('should set context with all parameters', () => {
    const error = new ExperimentKilledError('exp-99', 'conversion', 0.01, 0.05);
    expect(error.context).toEqual({
      experimentId: 'exp-99',
      signal: 'conversion',
      value: 0.01,
      threshold: 0.05,
    });
  });
});

describe('Error hierarchy', () => {
  it('should allow catching all custom errors as OutcomeRuntimeError', () => {
    const errors = [
      new SignalFetchError('src', 'msg'),
      new GateTimeoutError('g1', 'user'),
      new LLMError('openai', 'err'),
      new ConstraintViolationError('e1', 'c', 1, 2),
      new ConfigValidationError('msg', {}),
      new ExperimentKilledError('e1', 's', 1, 2),
    ];

    for (const error of errors) {
      expect(error).toBeInstanceOf(OutcomeRuntimeError);
    }
  });

  it('should allow catching all custom errors as Error', () => {
    const errors = [
      new OutcomeRuntimeError('CODE', 'msg'),
      new SignalFetchError('src', 'msg'),
      new GateTimeoutError('g1', 'user'),
      new LLMError('openai', 'err'),
      new ConstraintViolationError('e1', 'c', 1, 2),
      new ConfigValidationError('msg', {}),
      new ExperimentKilledError('e1', 's', 1, 2),
    ];

    for (const error of errors) {
      expect(error).toBeInstanceOf(Error);
    }
  });

  it('should differentiate errors by name property', () => {
    expect(new OutcomeRuntimeError('C', 'm').name).toBe('OutcomeRuntimeError');
    expect(new SignalFetchError('s', 'm').name).toBe('SignalFetchError');
    expect(new GateTimeoutError('g', 'u').name).toBe('GateTimeoutError');
    expect(new LLMError('p', 'm').name).toBe('LLMError');
    expect(new ConstraintViolationError('e', 'c', 1, 2).name).toBe('ConstraintViolationError');
    expect(new ConfigValidationError('m', {}).name).toBe('ConfigValidationError');
    expect(new ExperimentKilledError('e', 's', 1, 2).name).toBe('ExperimentKilledError');
  });
});
