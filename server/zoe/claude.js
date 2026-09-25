// Minimal manual tool-use loop over the Anthropic SDK (client injected so tests
// can supply a fake). Only compact tool payloads are sent — never the PDF.
import Anthropic from '@anthropic-ai/sdk';

export function makeClaudeClient(config) {
  if (!config.claudeEnabled) return null;
  return new Anthropic();
}

export async function claudeLoop(client, { model, system, user, history = [], tools = [], runTool, maxTurns = 8, fallbacks = process.env.NEPTUNE_CLAUDE_FALLBACKS !== '0' }) {
  const messages = [...history, { role: 'user', content: user }];
  const used = [];
  for (let turn = 0; turn < maxTurns; turn++) {
    const params = {
      model,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      system,
      messages,
      ...(tools.length ? { tools } : {}),
    };
    // Server-side refusal fallback (first-party API only; disable with NEPTUNE_CLAUDE_FALLBACKS=0).
    const res = fallbacks
      ? await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
      : await client.messages.create(params);
    if (res.stop_reason === 'refusal') throw Object.assign(new Error('refusal'), { userMessage: 'رفض النموذج هذا الطلب' });
    messages.push({ role: 'assistant', content: res.content });
    if (res.stop_reason === 'pause_turn') continue;
    const calls = res.content.filter(b => b.type === 'tool_use');
    if (res.stop_reason !== 'tool_use' || !calls.length) {
      const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
      return { text, toolsUsed: used, stopReason: res.stop_reason };
    }
    const results = [];
    for (const c of calls) {
      used.push(c.name);
      try {
        const out = await runTool(c.name, c.input || {});
        results.push({ type: 'tool_result', tool_use_id: c.id, content: JSON.stringify(out) });
      } catch (e) {
        results.push({ type: 'tool_result', tool_use_id: c.id, content: `error: ${e.message}`, is_error: true });
      }
    }
    messages.push({ role: 'user', content: results });
  }
  throw Object.assign(new Error('max turns'), { userMessage: 'تجاوز عدد خطوات الأدوات المسموح' });
}
