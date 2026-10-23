import worker, { type Env } from '../worker/src/index.ts';
import { fixtureAi } from './worker-fixtures.ts';
export default { fetch(request: Request, env: Env) { if (new URL(request.url).pathname === '/ready') return new Response('ready'); return worker.fetch(request, { ...env, AI: fixtureAi }); } };
