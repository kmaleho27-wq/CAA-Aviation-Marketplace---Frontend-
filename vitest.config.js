import { defineConfig } from 'vitest/config';

// Vitest config — kept minimal. Tests live alongside the code they
// exercise (`*.test.js`/`*.test.mjs`) plus the unit-test bucket under
// `supabase/tests/unit/`. Live integration tests (`supabase/tests/
// integration-*.mjs`) stay outside vitest — they hit the real DB.

export default defineConfig({
  test: {
    include: [
      'src/**/*.test.{js,jsx,ts,tsx,mjs}',
      'supabase/tests/unit/**/*.test.{js,mjs,ts}',
    ],
    environment: 'node',
    // Globals (describe, it, expect) so test files don't need imports.
    globals: true,
  },
});
