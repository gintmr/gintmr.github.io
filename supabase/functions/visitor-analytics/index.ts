import { createHandler, readConfig } from './core.mjs';

// The service role is used only inside this Edge Function, never in page source.
Deno.serve(createHandler(readConfig((name: string) => Deno.env.get(name))));
