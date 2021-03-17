// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

module.exports = {
  clearMocks: true,

  moduleNameMapper: {},

  roots: ["<rootDir>/src"],

  setupFiles: [],

  testEnvironment: "node",

  transform: {
    "^.+\\.(t|j)sx?$": "ts-jest",
  },

  modulePaths: ["<rootDir>/src/"],
};
