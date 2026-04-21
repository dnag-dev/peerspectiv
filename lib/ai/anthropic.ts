import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set in environment');
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

// Proxy that lazy-initializes on first property access.
// Lets existing `import { anthropic }` callers work unchanged.
export const anthropic: Anthropic = new Proxy({} as Anthropic, {
  get(_target, prop) {
    return Reflect.get(getClient() as any, prop);
  },
});

export const AI_MODEL = 'claude-sonnet-4-5';

export async function callClaude(
  systemPrompt: string,
  userContent: string,
  maxTokens: number = 4096
): Promise<string> {
  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('No text response from AI');

  return textBlock.text;
}
