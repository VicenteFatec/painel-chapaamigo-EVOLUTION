module.exports = {
  env: {
    node: true,
    es2023: true,
  },
  extends: "eslint:recommended",
  parserOptions: {
    ecmaVersion: 2023,
  },
  rules: {
    "no-unused-vars": "off",
    "no-undef": "off",
  },
  globals: {
    module: "readonly",
    exports: "readonly",
    require: "readonly",
    process: "readonly",
    __dirname: "readonly",
    __filename: "readonly",
    global: "readonly",
    console: "readonly",
  },
};