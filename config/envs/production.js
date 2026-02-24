module.exports = {
    // Production environment configuration
    rateLimiting: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        loginMax: 5, // stricter login attempts in production
    },
    pagination: {
        defaultLimit: 10,
        maxLimit: 100,
    },
    security: {
        bcryptRounds: 12, // stronger hashing in production
    },
}