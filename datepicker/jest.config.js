module.exports = {
    setupFiles: [
        './tests/setup.ts'
    ],
    moduleNameMapper: {
        '@/app(.*)$': '<rootDir>/$1',
    },
}