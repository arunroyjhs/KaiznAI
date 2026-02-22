import { resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

export async function validateCommand(options: { file?: string }) {
  const filePath = resolve(process.cwd(), options.file ?? 'outcome.yaml');

  if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    console.error('Run "npx outcome-runtime init" to create one.');
    process.exit(1);
  }

  const content = readFileSync(filePath, 'utf-8');

  try {
    // Dynamic import to avoid bundling issues
    const { parseOutcomeYaml } = await import('@outcome-runtime/core');
    const config = parseOutcomeYaml(content);

    console.log('outcome.yaml is valid!');
    console.log('');
    console.log(`  Version: ${config.version}`);
    console.log(`  Outcomes: ${config.outcomes.length}`);
    for (const outcome of config.outcomes) {
      console.log(`    - ${outcome.id}: ${outcome.title}`);
      console.log(`      Signal: ${outcome.signal.source}/${outcome.signal.metric}`);
      console.log(`      Target: ${outcome.target.direction} to ${outcome.target.to}`);
    }
    if (config.signal_connectors.length > 0) {
      console.log(`  Connectors: ${config.signal_connectors.map((c) => c.name).join(', ')}`);
    }
  } catch (err) {
    console.error('Invalid outcome.yaml:');
    if (err instanceof Error) {
      console.error(`  ${err.message}`);
    }
    process.exit(1);
  }
}
