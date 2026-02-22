export async function reportCommand(options: {
  id: string;
  summary: string;
  files?: string;
  flagKey?: string;
}) {
  const apiUrl = process.env.OR_API_URL ?? 'http://localhost:3001';
  const apiKey = process.env.OR_API_KEY ?? '';

  if (!options.id || !options.summary) {
    console.error('Usage: npx outcome-runtime report --id <id> --summary "..."');
    process.exit(1);
  }

  const filesChanged = options.files ? options.files.split(',').map((f) => f.trim()) : [];

  try {
    const response = await fetch(`${apiUrl}/api/v1/experiments/${options.id}/built`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        implementation_summary: options.summary,
        files_changed: filesChanged,
        feature_flag_key: options.flagKey,
      }),
    });

    if (!response.ok) {
      console.error(`Failed to report build: ${response.statusText}`);
      process.exit(1);
    }

    const result = await response.json();
    console.log('Build reported successfully!');
    console.log(`  Experiment: ${options.id}`);
    console.log(`  Status: ${result.status}`);
    console.log(`  ${result.message}`);
  } catch (err) {
    console.error('Failed to connect to Outcome Runtime API.');
    if (err instanceof Error) {
      console.error('Error:', err.message);
    }
    process.exit(1);
  }
}
