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
    // Phase 4 thresholds (Task 4.1): raised to match achieved coverage
    global: {
      branches: 70,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.test.json", useESM: true }],
  },
};
