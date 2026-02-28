/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  rootDir: ".",
  testMatch: ["<rootDir>/tests/unit/**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
  ],
  coverageThreshold: {
    // Current thresholds are set to pass with stub-heavy codebase.
    // TARGET thresholds (raise before V1): branches 70, functions 70, lines 80, statements 80
    global: {
      branches: 10,
      functions: 20,
      lines: 25,
      statements: 25,
    },
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.test.json", useESM: true }],
  },
};
