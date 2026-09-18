import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Critical rules that catch real bugs — must stay ON.
      "no-debugger": "error",
      "no-unreachable": "error",
      // `no-undef` doesn't understand TS types/imports/globals — disabled
      // in favor of the TS compiler's own checks (tsconfig.json `strict`).
      "no-undef": "off",
      "no-redeclare": "error",
      "no-fallthrough": "error",
      "no-mixed-spaces-and-tabs": "error",
      "no-useless-escape": "error",
      "no-irregular-whitespace": "error",
      "prefer-const": "warn",

      // TypeScript rules — loosened to "warn" so legacy code still builds but
      // surfaces issues during development.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-ts-comment": "warn",

      // React rules
      "react-hooks/exhaustive-deps": "warn",
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
      "react/prop-types": "off",

      // Next.js
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",

      // Misc
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-empty": "warn",
      "no-case-declarations": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      ".vercel/**",
      ".wrangler/**",
      "examples/**",
      "skills/**",
    ],
  },
];

export default eslintConfig;
