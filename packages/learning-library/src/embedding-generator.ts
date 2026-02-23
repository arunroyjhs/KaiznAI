/**
 * Generates vector embeddings for learnings to enable semantic search.
 * Uses the LLM Gateway to generate embeddings.
 */
export interface EmbeddingGenerator {
  generate(text: string): Promise<number[]>;
  generateBatch(texts: string[]): Promise<number[][]>;
}

/**
 * Simple embedding generator that uses OpenAI's embedding API.
 * Falls back to a basic TF-IDF-like approach if no API is available.
 */
export class OpenAIEmbeddingGenerator implements EmbeddingGenerator {
  constructor(
    private apiKey: string,
    private model: string = 'text-embedding-3-small',
  ) {}

  async generate(text: string): Promise<number[]> {
    const results = await this.generateBatch([text]);
    return results[0]!;
  }

  async generateBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI Embedding API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data
      .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
      .map((item: { embedding: number[] }) => item.embedding);
  }
}

/**
 * Simple local embedding fallback using basic text similarity.
 * Not as good as proper embeddings but works without API access.
 */
export class SimpleEmbeddingGenerator implements EmbeddingGenerator {
  private dimension = 1536;

  async generate(text: string): Promise<number[]> {
    return this.hashToVector(text);
  }

  async generateBatch(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.hashToVector(t));
  }

  private hashToVector(text: string): number[] {
    const words = text.toLowerCase().split(/\s+/);
    const vector = new Array(this.dimension).fill(0);

    for (const word of words) {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = ((hash << 5) - hash + word.charCodeAt(i)) | 0;
      }
      const idx = Math.abs(hash) % this.dimension;
      vector[idx] += 1;
    }

    // Normalize
    const magnitude = Math.sqrt(vector.reduce((sum: number, v: number) => sum + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= magnitude;
      }
    }

    return vector;
  }
}
