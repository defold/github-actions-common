/**
 * ESM test setup. Requires `node --experimental-vm-modules` (see the `test`
 * script) because @actions/core and @actions/github are ESM-only.
 */
export default {
  clearMocks: true,
  moduleFileExtensions: ['js', 'ts'],
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {useESM: true}]
  },
  // NodeNext sources import siblings as './foo.js'; map those back to the .ts source.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  verbose: true
};
