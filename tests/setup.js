/**
 * Test Setup
 * 
 * This file configures the test environment with MongoDB Memory Server
 * and provides helper functions for creating test fixtures.
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

/**
 * Connect to the in-memory MongoDB database
 */
const connect = async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    await mongoose.connect(mongoUri);
};

/**
 * Close database connection and stop server
 */
const closeDatabase = async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (mongoServer) {
        await mongoServer.stop();
    }
};

/**
 * Clear all data in the database
 */
const clearDatabase = async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
};

/**
 * Create mock managers and validators for unit testing
 */
const createMockDependencies = () => {
    const mongomodels = {
        user: require('../managers/entities/user/user.mongoModel'),
        school: require('../managers/entities/school/school.mongoModel'),
        classroom: require('../managers/entities/classroom/classroom.mongoModel'),
        student: require('../managers/entities/student/student.mongoModel'),
    };

    // Create real validators using the validator loader
    const ValidatorsLoader = require('../loaders/ValidatorsLoader');
    const validatorsLoader = new ValidatorsLoader({
        models: require('../managers/_common/schema.models'),
        customValidators: require('../managers/_common/schema.validators'),
    });
    const validators = validatorsLoader.load();

    // Mock token manager
    const tokenManager = {
        genLongToken: jest.fn((payload) => `mock_long_token_${payload.userId}`),
        verifyLongToken: jest.fn((token) => {
            if (token.startsWith('mock_long_token_')) {
                return { userId: token.replace('mock_long_token_', '') };
            }
            return null;
        }),
    };

    const managers = {
        token: tokenManager,
    };

    const config = {
        dotEnv: {
            LONG_TOKEN_SECRET: 'test-long-secret',
            SHORT_TOKEN_SECRET: 'test-short-secret',
        },
    };

    return {
        mongomodels,
        validators,
        managers,
        config,
        cache: {},
        cortex: {},
        utils: require('../libs/utils'),
    };
};

/**
 * Create test data fixtures
 */
const createTestSchool = async (schoolModel, overrides = {}) => {
    const defaultData = {
        name: 'Test School',
        address: '123 Test Street',
        phone: '123-456-7890',
        email: 'school@test.com',
        principal: 'John Principal',
        establishedYear: 2000,
        isActive: true,
        createdBy: new mongoose.Types.ObjectId(),
    };
    return await schoolModel.create({ ...defaultData, ...overrides });
};

const createTestUser = async (userModel, overrides = {}) => {
    const defaultData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'superadmin',
    };
    return await userModel.create({ ...defaultData, ...overrides });
};

const createTestClassroom = async (classroomModel, schoolId, createdBy, overrides = {}) => {
    const defaultData = {
        name: 'Test Classroom',
        schoolId,
        capacity: 30,
        grade: '10th',
        section: 'A',
        academicYear: '2024-2025',
        isActive: true,
        createdBy,
    };
    return await classroomModel.create({ ...defaultData, ...overrides });
};

const createTestStudent = async (studentModel, schoolId, createdBy, overrides = {}) => {
    const defaultData = {
        firstName: 'John',
        lastName: 'Doe',
        email: `student_${Date.now()}@test.com`,
        dateOfBirth: new Date('2000-01-01'),
        gender: 'male',
        schoolId,
        guardianName: 'Jane Doe',
        guardianPhone: '123-456-7890',
        isActive: true,
        createdBy,
    };
    return await studentModel.create({ ...defaultData, ...overrides });
};

/**
 * Create mock tokens for testing
 */
const createSuperadminToken = (userId = new mongoose.Types.ObjectId()) => ({
    userId: userId.toString(),
    userKey: 'superadmin',
    role: 'superadmin',
    schoolId: null,
});

const createSchoolAdminToken = (userId = new mongoose.Types.ObjectId(), schoolId) => ({
    userId: userId.toString(),
    userKey: 'schooladmin',
    role: 'school_admin',
    schoolId: schoolId?.toString() || new mongoose.Types.ObjectId().toString(),
});

module.exports = {
    connect,
    closeDatabase,
    clearDatabase,
    createMockDependencies,
    createTestSchool,
    createTestUser,
    createTestClassroom,
    createTestStudent,
    createSuperadminToken,
    createSchoolAdminToken,
};
