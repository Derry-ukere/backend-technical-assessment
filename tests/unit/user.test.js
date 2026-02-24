/**
 * User Manager Unit Tests
 * 
 * Tests for User.manager.js including:
 * - User creation
 * - User login
 * - Profile retrieval
 * - Profile update
 */

const {
    connect,
    closeDatabase,
    clearDatabase,
    createMockDependencies,
    createTestSchool,
} = require('../setup');

const UserManager = require('../../managers/entities/user/User.manager');

describe('User Manager', () => {
    let userManager;
    let deps;

    beforeAll(async () => {
        await connect();
        deps = createMockDependencies();
        userManager = new UserManager(deps);
    });

    afterAll(async () => {
        await closeDatabase();
    });

    beforeEach(async () => {
        await clearDatabase();
    });

    describe('createUser', () => {
        it('should create a superadmin user successfully', async () => {
            const result = await userManager.createUser({
                username: 'testadmin',
                email: 'admin@test.com',
                password: 'password123',
                role: 'superadmin',
            });

            expect(result.error).toBeUndefined();
            expect(result.errors).toBeUndefined();
            expect(result.user).toBeDefined();
            expect(result.user.username).toBe('testadmin');
            expect(result.user.email).toBe('admin@test.com');
            expect(result.user.role).toBe('superadmin');
            expect(result.user.password).toBeUndefined(); // Password should be removed from JSON
            expect(result.longToken).toBeDefined();
        });

        it('should create a school_admin user with valid schoolId', async () => {
            // First create a school
            const school = await createTestSchool(deps.mongomodels.school);

            const result = await userManager.createUser({
                username: 'schooladmin',
                email: 'schooladmin@test.com',
                password: 'password123',
                role: 'school_admin',
                schoolId: school._id.toString(),
            });

            expect(result.error).toBeUndefined();
            expect(result.user).toBeDefined();
            expect(result.user.role).toBe('school_admin');
            expect(result.user.schoolId.toString()).toBe(school._id.toString());
        });

        it('should fail when creating school_admin without schoolId', async () => {
            const result = await userManager.createUser({
                username: 'schooladmin',
                email: 'schooladmin@test.com',
                password: 'password123',
                role: 'school_admin',
            });

            expect(result.error).toBe('School ID is required for school admin');
        });

        it('should fail when creating school_admin with invalid schoolId', async () => {
            const result = await userManager.createUser({
                username: 'schooladmin',
                email: 'schooladmin@test.com',
                password: 'password123',
                role: 'school_admin',
                schoolId: '507f1f77bcf86cd799439011', // Non-existent ID
            });

            expect(result.error).toBe('Invalid school ID');
        });

        it('should fail when username already exists', async () => {
            await userManager.createUser({
                username: 'testuser',
                email: 'first@test.com',
                password: 'password123',
                role: 'superadmin',
            });

            const result = await userManager.createUser({
                username: 'testuser',
                email: 'second@test.com',
                password: 'password123',
                role: 'superadmin',
            });

            expect(result.error).toBe('User with this email or username already exists');
        });

        it('should fail when email already exists', async () => {
            await userManager.createUser({
                username: 'user1',
                email: 'same@test.com',
                password: 'password123',
                role: 'superadmin',
            });

            const result = await userManager.createUser({
                username: 'user2',
                email: 'same@test.com',
                password: 'password123',
                role: 'superadmin',
            });

            expect(result.error).toBe('User with this email or username already exists');
        });

        it('should fail with validation errors for missing required fields', async () => {
            const result = await userManager.createUser({
                username: '',
                email: '',
                password: '',
                role: '',
            });

            expect(result.errors).toBeDefined();
            expect(Array.isArray(result.errors)).toBe(true);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should fail with invalid email format', async () => {
            const result = await userManager.createUser({
                username: 'testuser',
                email: 'invalid-email',
                password: 'password123',
                role: 'superadmin',
            });

            expect(result.errors).toBeDefined();
        });
    });

    describe('login', () => {
        beforeEach(async () => {
            // Create a test user for login tests
            await userManager.createUser({
                username: 'loginuser',
                email: 'login@test.com',
                password: 'password123',
                role: 'superadmin',
            });
        });

        it('should login successfully with valid credentials', async () => {
            const result = await userManager.login({
                email: 'login@test.com',
                password: 'password123',
            });

            expect(result.error).toBeUndefined();
            expect(result.user).toBeDefined();
            expect(result.user.email).toBe('login@test.com');
            expect(result.longToken).toBeDefined();
        });

        it('should fail with invalid email', async () => {
            const result = await userManager.login({
                email: 'wrong@test.com',
                password: 'password123',
            });

            expect(result.error).toBe('Invalid email or password');
        });

        it('should fail with invalid password', async () => {
            const result = await userManager.login({
                email: 'login@test.com',
                password: 'wrongpassword',
            });

            expect(result.error).toBe('Invalid email or password');
        });

        it('should fail with missing email', async () => {
            const result = await userManager.login({
                email: '',
                password: 'password123',
            });

            expect(result.error).toBe('Email and password are required');
        });

        it('should fail with missing password', async () => {
            const result = await userManager.login({
                email: 'login@test.com',
                password: '',
            });

            expect(result.error).toBe('Email and password are required');
        });
    });

    describe('getUserProfile', () => {
        let createdUser;

        beforeEach(async () => {
            const result = await userManager.createUser({
                username: 'profileuser',
                email: 'profile@test.com',
                password: 'password123',
                role: 'superadmin',
            });
            createdUser = result.user;
        });

        it('should get user profile successfully', async () => {
            const result = await userManager.getUserProfile({
                __token: { userId: createdUser._id.toString() },
            });

            expect(result.error).toBeUndefined();
            expect(result.user).toBeDefined();
            expect(result.user.email).toBe('profile@test.com');
        });

        it('should fail without authentication', async () => {
            const result = await userManager.getUserProfile({});

            expect(result.error).toBe('Authentication required');
        });

        it('should fail with invalid user ID', async () => {
            const result = await userManager.getUserProfile({
                __token: { userId: '507f1f77bcf86cd799439011' },
            });

            expect(result.error).toBe('User not found');
        });
    });

    describe('updateUser', () => {
        let createdUser;

        beforeEach(async () => {
            const result = await userManager.createUser({
                username: 'updateuser',
                email: 'update@test.com',
                password: 'password123',
                role: 'superadmin',
            });
            createdUser = result.user;
        });

        it('should update username successfully', async () => {
            const result = await userManager.updateUser({
                username: 'newusername',
                __token: { userId: createdUser._id.toString() },
            });

            expect(result.error).toBeUndefined();
            expect(result.user).toBeDefined();
            expect(result.user.username).toBe('newusername');
        });

        it('should update email successfully', async () => {
            const result = await userManager.updateUser({
                email: 'newemail@test.com',
                __token: { userId: createdUser._id.toString() },
            });

            expect(result.error).toBeUndefined();
            expect(result.user).toBeDefined();
            expect(result.user.email).toBe('newemail@test.com');
        });

        it('should fail without authentication', async () => {
            const result = await userManager.updateUser({
                username: 'newname',
            });

            expect(result.error).toBe('Authentication required');
        });
    });
});
