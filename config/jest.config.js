module.exports = {
  rootDir: '../',
  testURL: 'http://localhost',
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: ['**/module/**/*.js', '!**/node_modules/**', '!**/module/**/index.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  transformIgnorePatterns: ['/node_modules/'],
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/config/test/mocks/fileMock.js',
    '\\.(css|scss)$': 'identity-obj-proxy'
  },
  setupFiles: ['<rootDir>/config/test/shim.js', '<rootDir>/config/test/test-setup.js']
};
