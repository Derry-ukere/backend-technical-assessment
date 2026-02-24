/**
 * Integration Test Setup
 * 
 * This file sets up the test environment for integration testing
 * with MongoDB Memory Server and mocked external services.
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');

let mongoServer;
let app;
let managers;

/**
 * Initialize the integration test environment
 */
const setupIntegrationTests = async () => {
    // Start MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect to in-memory MongoDB
    await mongoose.connect(mongoUri);

    // Set up config
    const config = {
        dotEnv: {
            SERVICE_NAME: 'school-management-api-test',
            USER_PORT: 0, // Random port
            MONGO_URI: mongoUri,
            LONG_TOKEN_SECRET: 'test-long-token-secret-12345',
            SHORT_TOKEN_SECRET: 'test-short-token-secret-12345',
            CACHE_PREFIX: 'test_cache',
            CORTEX_PREFIX: 'test_cortex',
            OYSTER_PREFIX: 'test_oyster',
        }
    };

    // Create stub for cache (in-memory)
    const cache = {
        get: async (key) => null,
        set: async (key, value) => true,
        del: async (key) => true,
    };

    // Create stub for cortex
    const cortex = {
        sub: () => {},
        publish: () => {},
        AsyncEmitToOneOf: () => Promise.resolve({}),
    };

    // Create stub for oyster
    const oyster = {
        set: async () => true,
        get: async () => null,
        del: async () => true,
    };

    // Create stub for aeon
    const aeon = {
        set: async () => true,
        get: async () => null,
    };

    // Load managers  
    const ManagersLoader = require('../../loaders/ManagersLoader.js');
    const managersLoader = new ManagersLoader({ config, cache, cortex, oyster, aeon });
    managers = managersLoader.load();

    // Create Express app
    app = express();
    app.use(cors({ origin: '*' }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Error handler
    app.use((err, req, res, next) => {
        console.error('Test Error:', err);
        res.status(500).json({ ok: false, error: 'Internal Server Error' });
    });

    // Single middleware to handle all API routes
    app.all('/api/:moduleName/:fnName', managers.userApi.mw);

    return { app, managers, config };
};

/**
 * Clean up after all tests
 */
const teardownIntegrationTests = async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (mongoServer) {
        await mongoServer.stop();
    }
};

/**
 * Clear all collections between tests
 */
const clearAllCollections = async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
};

/**
 * Helper to create a superadmin user and get token
 */
const createSuperadminAndLogin = async (request, appInstance) => {
    // Create superadmin
    const createRes = await request(appInstance)
        .post('/api/user/createUser')
        .send({
            username: 'superadmin',
            email: 'superadmin@test.com',
            password: 'password123',
            role: 'superadmin'
        });

    return {
        user: createRes.body.user,
        token: createRes.body.longToken
    };
};

/**
 * Helper to create a school admin user (requires school first)
 */
const createSchoolAdminAndLogin = async (request, appInstance, token, schoolId) => {
    const createRes = await request(appInstance)
        .post('/api/user/createUser')
        .set('Authorization', `Bearer ${token}`)
        .send({
            username: 'schooladmin',
            email: 'schooladmin@test.com',
            password: 'password123',
            role: 'school_admin',
            schoolId
        });

    return {
        user: createRes.body.user,
        token: createRes.body.longToken
    };
};

/**
 * Helper to create a test school
 */
const createTestSchool = async (request, appInstance, token, overrides = {}) => {
    const schoolData = {
        name: 'Test School',
        address: '123 Test Street',
        phone: '123-456-7890',
        email: 'school@test.com',
        principal: 'John Principal',
        establishedYear: 2000,
        ...overrides
    };

    const res = await request(appInstance)
        .post('/api/school/createSchool')
        .set('Authorization', `Bearer ${token}`)
        .send(schoolData);

    return res.body.school;
};

/**
 * Helper to create a test classroom
 */
const createTestClassroom = async (request, appInstance, token, schoolId, overrides = {}) => {
    const classroomData = {
        name: 'Test Classroom',
        schoolId,
        capacity: 30,
        grade: '10th',
        section: 'A',
        academicYear: '2024-2025',
        ...overrides
    };

    const res = await request(appInstance)
        .post('/api/classroom/createClassroom')
        .set('Authorization', `Bearer ${token}`)
        .send(classroomData);

    return res.body.classroom;
};

/**
 * Helper to create a test student
 */
const createTestStudent = async (request, appInstance, token, schoolId, classroomId = null, overrides = {}) => {
    const studentData = {
        firstName: 'John',
        lastName: 'Doe',
        email: `student_${Date.now()}@test.com`,
        dateOfBirth: '2000-01-15',
        gender: 'male',
        schoolId,
        classroomId,
        guardianName: 'Jane Doe',
        guardianPhone: '123-456-7890',
        ...overrides
    };

    const res = await request(appInstance)
        .post('/api/student/createStudent')
        .set('Authorization', `Bearer ${token}`)
        .send(studentData);

    return res.body.student;
};

module.exports = {
    setupIntegrationTests,
    teardownIntegrationTests,
    clearAllCollections,
    createSuperadminAndLogin,
    createSchoolAdminAndLogin,
    createTestSchool,
    createTestClassroom,
    createTestStudent,
};
