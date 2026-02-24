/**
 * Test App Setup for Integration Tests
 * 
 * Creates an Express app instance that can be used with supertest
 * without starting a real HTTP server.
 */

const express = require('express');
const cors = require('cors');

/**
 * Creates a test Express app with all API routes configured
 * 
 * @param {object} managers - The managers object containing all business logic
 * @returns {Express.Application} - Configured Express app for testing
 */
const createTestApp = (managers) => {
    const app = express();

    // Configure middleware
    app.use(cors({ origin: '*' }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Error handler
    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).json({ ok: false, error: 'Something broke!' });
    });

    // Single middleware to handle all API routes
    app.all('/api/:moduleName/:fnName', managers.userApi.mw);

    return app;
};

module.exports = { createTestApp };
