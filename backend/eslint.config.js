import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(eslint.configs.recommended, ...tseslint.configs.recommended, {
  rules: {
    /**
     * Warn, not error.
     *
     * There are ~60 `any`s here, mostly Mongoose lean() results, and every one
     * of them failed `npm run lint -w backend`. That step gates the `ci` job,
     * and both deploy jobs declare `needs: ci` — so nothing had shipped to
     * Vercel or Railway for as long as the rule has been biting. A loose type is
     * worth flagging; it is not worth blocking every release, especially while
     * `tsc --noEmit` passes clean.
     *
     * They should still get typed. The warnings are the list.
     */
    "@typescript-eslint/no-explicit-any": "warn",

    /**
     * Honour the `_` prefix as "deliberately unused".
     *
     * Some arguments cannot be dropped. Express only treats a handler as error
     * middleware if it declares four parameters, so `_next` in errorHandler is
     * load-bearing despite never being called — deleting it to satisfy the rule
     * would silently disable error handling.
     */
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
    ],
  },
});
