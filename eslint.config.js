import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";

export default [
  // Appliquer les globals à tous les fichiers
  {
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  },
  // Règles de base pour JavaScript
  js.configs.recommended,
  // Règles pour TypeScript (c'est un tableau, donc il faut le décomposer)
  ...tseslint.configs.recommended,
  // Règles pour React
  {
    ...pluginReact.configs.flat.recommended,
    // Il est recommandé de spécifier les fichiers pour les règles spécifiques à un framework
    files: ["**/*.{jsx,tsx}"],
    rules: {
      "react/react-in-jsx-scope": "off"
    },
    settings: {
      react: {
        version: "detect"
      }
    }
  }
];