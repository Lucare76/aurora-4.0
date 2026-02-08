module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    // Portato a 2020 per supportare meglio le funzioni moderne
    ecmaVersion: 2020,
  },
  extends: [
    "eslint:recommended",
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", { "allowTemplateLiterals": true }],

    // Disattivata: troppo rigida e spesso causa di errori inutili
    "valid-jsdoc": "off",

    // Necessario per evitare l'errore "Newline required at end of file"
    "eol-last": ["error", "always"],

    // Limite più umano per la lunghezza delle righe
    "max-len": ["error", {
      code: 120,
      ignoreUrls: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
    }],
    
    // Disattiva l'obbligo dei commenti JSDoc che Google imponeva
    "require-jsdoc": "off",
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};
