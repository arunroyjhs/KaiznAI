#!/usr/bin/env node
import { program } from 'commander';

program
  .name('outcome-runtime')
  .description('The infrastructure layer for outcome-driven experimentation')
  .version('0.1.0');

program.parse();
