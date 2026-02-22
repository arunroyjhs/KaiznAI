import yaml from 'js-yaml';
import { outcomeYamlSchema, type OutcomeYamlConfig } from './schema.js';
import { ConfigValidationError } from '../errors.js';

/**
 * Interpolate environment variables in a string.
 * Replaces ${VAR_NAME} with the value of process.env.VAR_NAME.
 */
function interpolateEnvVars(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (_match, varName: string) => {
    const envValue = process.env[varName];
    if (envValue === undefined) {
      return '';
    }
    return envValue;
  });
}

/**
 * Recursively interpolate environment variables in an object.
 */
function interpolateObject(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return interpolateEnvVars(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(interpolateObject);
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateObject(value);
    }
    return result;
  }
  return obj;
}

/**
 * Parse an outcome.yaml string into a validated configuration object.
 */
export function parseOutcomeYaml(yamlContent: string): OutcomeYamlConfig {
  let parsed: unknown;
  try {
    parsed = yaml.load(yamlContent);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown YAML parse error';
    throw new ConfigValidationError(`Invalid YAML syntax: ${message}`, {
      yaml: [message],
    });
  }

  // Interpolate environment variables
  const interpolated = interpolateObject(parsed);

  // Validate with Zod
  const result = outcomeYamlSchema.safeParse(interpolated);

  if (!result.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(issue.message);
    }
    throw new ConfigValidationError('Invalid outcome.yaml configuration', errors);
  }

  return result.data;
}

/**
 * Parse an outcome.yaml file from a file path.
 */
export async function parseOutcomeYamlFile(filePath: string): Promise<OutcomeYamlConfig> {
  const { readFile } = await import('node:fs/promises');
  const content = await readFile(filePath, 'utf-8');
  return parseOutcomeYaml(content);
}
