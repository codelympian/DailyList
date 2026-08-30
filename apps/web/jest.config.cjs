/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src/lib'],
  testMatch: ['**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        // The Next.js tsconfig targets the bundler; tests run in plain Node.
        tsconfig: { module: 'commonjs', moduleResolution: 'node', jsx: 'react-jsx' },
      },
    ],
  },
};
