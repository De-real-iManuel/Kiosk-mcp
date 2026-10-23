/**
 * Amazon Bedrock — Titan Embeddings V2 integration.
 *
 * Used by search_businesses to score results semantically so queries like
 * "something for my hair" find hair salons even without keyword matches.
 *
 * Enabled when BEDROCK_ENABLED=true and AWS credentials are available.
 * If semantic ranking fails, falls back to lexical matches rather than
 * returning unrelated candidates.
 *
 * Model: amazon.titan-embed-text-v2:0
 * Dimensions: 1024 (default for V2)
 * Max input: 8,192 tokens
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const REGION = process.env.AWS_REGION ?? "us-east-1";
const MODEL_ID = "amazon.titan-embed-text-v2:0";
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "at",
  "can",
  "do",
  "for",
  "find",
  "get",
  "i",
  "in",
  "is",
  "me",
  "my",
  "near",
  "of",
  "please",
  "the",
  "to",
  "want",
  "where",
  "with",
]);

// Lazy-initialise client — only created when first needed
let _client: BedrockRuntimeClient | null = null;

function getClient(): BedrockRuntimeClient {
  if (!_client) {
    _client = new BedrockRuntimeClient({ region: REGION });
  }
  return _client;
}

export function isBedrockEnabled(): boolean {
  return process.env.BEDROCK_ENABLED === "true";
}

/**
 * Generates a 1024-dimension embedding vector for the given text using
 * Amazon Titan Embeddings V2 via Bedrock.
 *
 * Throws on Bedrock API errors — callers should catch and fall back.
 */
export async function embedText(text: string): Promise<number[]> {
  const client = getClient();

  const response = await client.send(
    new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        inputText: text.slice(0, 8000), // stay safely under 8192 token limit
        dimensions: 1024,
        normalize: true,
      }),
    }),
  );

  const result = JSON.parse(new TextDecoder().decode(response.body)) as {
    embedding: number[];
  };

  return result.embedding;
}

/**
 * Cosine similarity between two equal-length vectors.
 * Returns a value between -1 and 1; higher = more similar.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Scores a list of business rows against a search query.
 *
 * When Bedrock is available:
 *   - Embeds the query and each business's profile text
 *   - Score = 0.65 × semantic + 0.35 × keyword (combined ranking)
 *
 * When Bedrock fails during semantic search:
 *   - Falls back to lexical matching and excludes candidates without query matches
 *
 * @param query - The user's search query
 * @param rows  - Business rows from the DB query
 * @returns The same rows sorted by descending relevance score
 */
export function keywordFallbackRank<
  T extends {
    name: string;
    description: string | null;
    city: string | null;
    location: string | null;
  },
>(query: string, rows: T[]): T[] {
  // Unicode property escapes preserve words in scripts such as Arabic and
  // Chinese, including single-character terms that are meaningful in CJK.
  const words = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])].filter(
    (word) =>
      (word.length > 1 || /[^\x00-\x7F]/u.test(word)) &&
      !STOP_WORDS.has(word),
  );
  if (words.length === 0) return [];

  return rows
    .map((row) => {
      const profile = [row.name, row.description, row.city, row.location]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matches = words.filter((word) => profile.includes(word)).length;
      return { row, matches };
    })
    .filter(({ matches }) => matches > 0)
    .sort((a, b) => b.matches - a.matches)
    .map(({ row }) => row);
}

export async function scoreAndRank<
  T extends {
    name: string;
    description: string | null;
    city: string | null;
    location: string | null;
  },
>(query: string, rows: T[]): Promise<T[]> {
  if (!isBedrockEnabled() || !query || rows.length === 0) {
    return rows; // SQL filtering already handles non-semantic searches.
  }

  try {
    // Build a profile string for each business — what Titan will embed
    const profileTexts = rows.map((r) =>
      [r.name, r.description, r.city, r.location].filter(Boolean).join(". "),
    );

    // Embed query + all profiles in parallel
    const [queryVec, ...profileVecs] = await Promise.all([
      embedText(query),
      ...profileTexts.map((t) => embedText(t)),
    ]);

    // Keyword score: simple word overlap normalised to [0,1]
    const queryWords = new Set(query.toLowerCase().split(/\s+/));
    const keywordScore = (r: T): number => {
      const text = profileTexts[rows.indexOf(r)].toLowerCase();
      let matches = 0;
      for (const w of queryWords) {
        if (text.includes(w)) matches++;
      }
      return queryWords.size > 0 ? matches / queryWords.size : 0;
    };

    // Combined score
    const scored = rows.map((r, i) => ({
      row: r,
      score:
        0.65 * cosineSimilarity(queryVec, profileVecs[i]) +
        0.35 * keywordScore(r),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.row);
  } catch (error) {
    // Do not return arbitrary businesses when semantic ranking is unavailable.
    // Fall back to lexical matches, and return no results if none match.
    console.warn(
      "[search_businesses] Bedrock ranking unavailable; using keyword fallback",
      error instanceof Error ? error.message : "Unknown Bedrock error",
    );
    return keywordFallbackRank(query, rows);
  }
}
