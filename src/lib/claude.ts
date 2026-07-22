import Anthropic from "@anthropic-ai/sdk";

// The Anthropic key is stored in Vercel (and .env.local) as CLAUDE_ANTHROPIC,
// not the SDK's default ANTHROPIC_API_KEY — so pass it explicitly.
const apiKey = process.env.CLAUDE_ANTHROPIC;

export const CLAUDE_MODEL = "claude-opus-4-8";

export function isClaudeConfigured(): boolean {
  return !!apiKey;
}

let client: Anthropic | null = null;

export function getClaude(): Anthropic {
  if (!apiKey) {
    throw new Error(
      "CLAUDE_ANTHROPIC is not set — the AI agent is not configured."
    );
  }
  if (!client) client = new Anthropic({ apiKey });
  return client;
}
