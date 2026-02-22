#!/usr/bin/env node
import { program } from 'commander';
import { initCommand } from './commands/init.js';
import { validateCommand } from './commands/validate.js';
import { experimentCommand } from './commands/experiment.js';
import { reportCommand } from './commands/report.js';
import { statusCommand } from './commands/status.js';

program
  .name('outcome-runtime')
  .description('The infrastructure layer for outcome-driven experimentation')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize outcome.yaml in the current directory')
  .action(initCommand);

program
  .command('validate')
  .description('Validate an outcome.yaml configuration file')
  .option('-f, --file <path>', 'Path to outcome.yaml file', 'outcome.yaml')
  .action(validateCommand);

program
  .command('experiment')
  .description('Get experiment brief for an AI agent to build')
  .requiredOption('--id <id>', 'Experiment ID')
  .action(experimentCommand);

program
  .command('report')
  .description('Report that an experiment has been built')
  .requiredOption('--id <id>', 'Experiment ID')
  .requiredOption('--summary <summary>', 'Implementation summary')
  .option('--files <files>', 'Comma-separated list of changed files')
  .option('--flag-key <key>', 'Feature flag key used')
  .action(reportCommand);

program
  .command('status')
  .description('Show all outcomes and their current state')
  .action(statusCommand);

program.parse();
