import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Sempre por último: desliga as regras de estilo que conflitam com o Prettier.
  prettier,
  // Arquivos gerados por ferramentas: não são código nosso.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    "blob-report/**",
    ".playwright-mcp/**",
    "supabase/.temp/**",
  ]),
]);

export default eslintConfig;
