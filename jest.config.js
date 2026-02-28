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
    // Phase 1 thresholds: only AnnotationService has tests currently.
    // TARGET thresholds (raise before V1): branches 70, functions 70, lines 80, statements 80
    global: {
      branches: 2,
      functions: 5,
      lines: 5,
      statements: 5,
    },
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.test.json", useESM: true }],
  },
};
