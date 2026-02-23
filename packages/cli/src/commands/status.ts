export async function statusCommand() {
  const apiUrl = process.env.OR_API_URL ?? 'http://localhost:3001';
  const apiKey = process.env.OR_API_KEY ?? '';

  try {
    const response = await fetch(`${apiUrl}/api/v1/outcomes`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch outcomes: ${response.statusText}`);
      process.exit(1);
    }

    const result = await response.json();
    const outcomes = result.data ?? [];

    if (outcomes.length === 0) {
      console.log('No outcomes found.');
      console.log('Create one at http://localhost:3000 or define in outcome.yaml');
      return;
    }

    console.log('Active Outcomes:');
    console.log('');
    for (const outcome of outcomes) {
      const statusIcon =
        outcome.status === 'active' ? '[*]' :
        outcome.status === 'achieved' ? '[+]' :
        outcome.status === 'draft' ? '[ ]' : '[x]';

      console.log(`  ${statusIcon} ${outcome.title}`);
      console.log(`      Status: ${outcome.status}`);
      if (outcome.experiments) {
        console.log(`      Experiments: ${outcome.experiments.length}`);
      }
      console.log('');
    }
  } catch (err) {
    console.error('Failed to connect to Outcome Runtime API.');
    console.error('Make sure the API is running at:', apiUrl);
    if (err instanceof Error) {
      console.error('Error:', err.message);
    }
    process.exit(1);
  }
}
