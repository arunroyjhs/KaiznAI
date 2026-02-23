export async function experimentCommand(options: { id: string }) {
  const apiUrl = process.env.OR_API_URL ?? 'http://localhost:3001';
  const apiKey = process.env.OR_API_KEY ?? '';

  if (!options.id) {
    console.error('Experiment ID is required. Usage: npx outcome-runtime experiment --id <id>');
    process.exit(1);
  }

  try {
    const response = await fetch(`${apiUrl}/api/v1/experiments/${options.id}/brief`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch experiment brief: ${response.statusText}`);
      process.exit(1);
    }

    const brief = await response.json();
    console.log(JSON.stringify(brief, null, 2));
  } catch (err) {
    console.error('Failed to connect to Outcome Runtime API.');
    console.error('Make sure the API is running at:', apiUrl);
    if (err instanceof Error) {
      console.error('Error:', err.message);
    }
    process.exit(1);
  }
}
