import { writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const EXAMPLE_YAML = `# outcome.yaml — Outcome Runtime Configuration
# Documentation: https://docs.outcomeruntime.dev/config
version: 1

outcomes:
  - id: my-first-outcome
    title: "Improve Conversion Rate"
    description: "Increase the checkout conversion rate"

    signal:
      source: postgres
      metric: conversion_rate
      method: event
      aggregation: 7d_rolling

    target:
      direction: increase
      from: 0.05
      to: 0.08
      confidence_required: 0.95

    constraints: []
    horizon: 4w

    portfolio:
      max_concurrent: 3

    gates:
      portfolio_review:
        assigned_to: "you@company.com"
        sla: 24h
      launch_approval:
        assigned_to: "you@company.com"
        sla: 4h
      analysis_review:
        assigned_to: "you@company.com"
        sla: 48h

    scope:
      allowed_paths: []
      forbidden_paths: []

llm:
  default_provider: anthropic

signal_connectors:
  - name: postgres
    type: postgres
    config:
      connection_string: "\${DATABASE_URL}"
`;

export async function initCommand() {
  const targetPath = resolve(process.cwd(), 'outcome.yaml');

  if (existsSync(targetPath)) {
    console.log('outcome.yaml already exists in this directory.');
    console.log('Delete it first if you want to regenerate.');
    process.exit(1);
  }

  writeFileSync(targetPath, EXAMPLE_YAML, 'utf-8');

  console.log('Created outcome.yaml');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Edit outcome.yaml with your outcome definition');
  console.log('  2. Run: docker-compose up -d');
  console.log('  3. Run: npx outcome-runtime validate');
  console.log('  4. Open http://localhost:3000 to see the dashboard');
  console.log('');
  console.log('Docs: https://docs.outcomeruntime.dev');
}
