import { plugin as shadcn } from "@shadcn/lint";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "public/**",
      ".svelte-kit/**",
      "scripts/**"
    ]
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    plugins: {
      shadcn
    },
    rules: {
      "shadcn/no-restyle": [
        "error",
        {
          allow: ["layout"],
          contracts: [
            {
              pattern: "^Button$",
              allow: ["layout", "w-full", "min-w-*", "max-w-*"],
              deny: ["p-*", "px-*", "py-*", "rounded-*"],
              message: {
                spacing: "Use Button size variants (sm, lg, icon) instead of custom padding.",
                default: "Use Button variants (default, secondary, ghost, destructive) instead of custom styles."
              }
            }
          ]
        }
      ],
      "shadcn/no-raw-colors": [
        "error",
        {
          message: "Use a theme color token from DESIGN.md (bg, surface, line, ink, muted, subtle, accent, good, warn, bad)."
        }
      ],
      "shadcn/no-arbitrary-values": [
        "error",
        {
          allow: [
            "layout",
            "h-*",
            "max-h-*",
            "pt-*",
            "pb-*",
            "text-*",
            "-ml-*",
            "tracking-*"
          ],
          message: "Use design system scale tokens instead of arbitrary values per DESIGN.md."
        }
      ],
      "shadcn/no-inline-styles": [
        "error",
        {
          allow: [
            "transform",
            "transition",
            "flexGrow",
            "flex-grow",
            "width"
          ]
        }
      ],
      "shadcn/no-unknown-classes": "error"
    }
  },
  {
    files: ["src/lib/components/ui/**"],
    rules: {
      "shadcn/no-restyle": "off",
      "shadcn/no-arbitrary-values": "off"
    }
  }
];
