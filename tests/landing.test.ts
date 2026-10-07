import { afterEach, describe, expect, it, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../convex/schema';
const modules = import.meta.glob('../convex/**/*.ts');
afterEach(() => vi.unstubAllEnvs());
describe('landing public chat configuration', () => {
  it('returns only the public direct Hi link, never provider credentials', async () => {
    vi.stubEnv('WHATSAPP_AGENT_NUMBER', '919000000099');
    vi.stubEnv('WHATSAPP_TOKEN', 'fake-token-not-public');
    vi.stubEnv('OPENAI_API_KEY', 'fake-key-not-public');
    const response = await convexTest(schema, modules).fetch('/landing-config');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ chatUrl: 'https://wa.me/919000000099?text=Hi' });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
  it.each([undefined, '+91 9000000099', 'javascript:alert(1)', ''])('fails closed for missing/malformed agent number %s', async number => {
    if (number === undefined) vi.stubEnv('WHATSAPP_AGENT_NUMBER', undefined);
    else vi.stubEnv('WHATSAPP_AGENT_NUMBER', number);
    const response = await convexTest(schema, modules).fetch('/landing-config');
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ chatUrl: null });
  });
});
