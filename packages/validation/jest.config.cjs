/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        // The package compiles as NodeNext; tests run through plain CommonJS.
        tsconfig: { module: 'commonjs', moduleResolution: 'node' },
      },
    ],
  },
};
