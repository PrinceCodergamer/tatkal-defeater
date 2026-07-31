import { defineConfig, globalIgnores } from 'eslint/config';
import { FlatCompat } from '@eslint/eslintrc';
import tseslint from 'typescript-eslint';

/**
 * ESLint 9 flat config for the Next.js web app.
 * eslint-config-next ships legacy .eslintrc configs, so we bridge them
 * with FlatCompat, then layer TypeScript-aware rules and app rules on top.
 */
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default defineConfig([
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  ...tseslint.configs.recommended,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'node_modules/**',
    'next-env.d.ts',
    // Config files use anonymous default exports by convention.
    'postcss.config.mjs',
    'next.config.mjs',
    'eslint.config.mjs',
  ]),
  {
    rules: {
      // Disallow console.log in prod code — prefer structured logging.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Design-system hygiene: no raw hex colors in component code.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/#[0-9a-fA-F]{3,8}\\b/]',
          message: 'No raw hex colors in components — use a design token from globals.css.',
        },
      ],
    },
  },
]);
