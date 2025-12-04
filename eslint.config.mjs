import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // eslint-disable-next-line
      "react/forbid-dom-props": "off",
      // eslint-disable-next-line
      "react/forbid-component-props": "off",
      // eslint-disable-next-line
      "react/style-prop-object": "off",
    },
  },
]);

export default eslintConfig;
