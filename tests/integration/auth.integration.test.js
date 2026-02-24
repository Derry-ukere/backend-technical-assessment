/**
 * Authentication Integration Tests
 * 
 * Tests the full authentication flow through the API including:
 * - User registration (createUser)
 * - User login
 * - Profile retrieval
 * - Profile update
 */

const request = require('supertest');
const {
    setupIntegrationTests,
    teardownIntegrationTests,
    clearAllCollections,
    createSuperadminAndLogin,
    createSchoolAdminAndLogin,
    createTestSchool,
} = require('./setup.integration');

describe('Authentication API', () => {
    let app;
    let managers;

    beforeAll(async () => {
        const setup = await setupIntegrationTests();
        app = setup.app;
        managers = setup.managers;
    });

    afterAll(async () => {
        await teardownIntegrationTests();
    });

    beforeEach(async () => {
        await clearAllCollections();
    });

    describe('POST /api/user/createUser', () => {
        it('should create a superadmin user successfully', async () => {
            const res = await request(app)
                .post('/api/user/createUser')
                .send({
                    username: 'superadmin',
                    email: 'superadmin@test.com',
                    password: 'password123',
                    role: 'superadmin'
                });

            expect(res.body.ok).not.toBe(false);
            expect(res.body.user).toBeDefined();
            expect(res.body.user.username).toBe('superadmin');
            expect(res.body.user.email).toBe('superadmin@test.com');
            expect(res.body.user.role).toBe('superadmin');
            expect(res.body.user.password).toBeUndefined();
            expect(res.body.longToken).toBeDefined();
        });

        it('should create a school_admin user with valid schoolId', async () => {
            // First create a superadmin and a school
            const { token: superToken } = await createSuperadminAndLogin(request, app);
            const school = await createTestSchool(request, app, superToken);

            const res = await request(app)
                .post('/api/user/createUser')
                .send({
                    username: 'schooladmin',
                    email: 'schooladmin@test.com',
                    password: 'password123',
                    role: 'school_admin',
                    schoolId: school._id
                });

            expect(res.body.ok).not.toBe(false);
            expect(res.body.user).toBeDefined();
            expect(res.body.user.role).toBe('school_admin');
            expect(res.body.user.schoolId.toString()).toBe(school._id.toString());
        });

        it('should fail when creating school_admin without schoolId', async () => {
            const res = await request(app)
                .post('/api/user/createUser')
                .send({
                    username: 'schooladmin',
                    email: 'schooladmin@test.com',
                    password: 'password123',
                    role: 'school_admin'
                });

            expect(res.body.error).toBe('School ID is required for school admin');
        });

        it('should fail when creating school_admin with invalid schoolId', async () => {
            const res = await request(app)
                .post('/api/user/createUser')
                .send({
                    username: 'schooladmin',
                    email: 'schooladmin@test.com',
                    password: 'password123',
                    role: 'school_admin',
                    schoolId: '507f1f77bcf86cd799439011'
                });

            expect(res.body.error).toBe('Invalid school ID');
        });

        it('should fail when username already exists', async () => {
            // Create first user
            await request(app)
                .post('/api/user/createUser')
                .send({
                    username: 'testuser',
                    email: 'user1@test.com',
                    password: 'password123',
                    role: 'superadmin'
                });

            // Try to create another user with same username
            const res = await request(app)
                .post('/api/user/createUser')
                .send({
                    username: 'testuser',
                    email: 'user2@test.com',
                    password: 'password123',
                    role: 'superadmin'
                });

            expect(res.body.error).toBe('User with this email or username already exists');
        });

        it('should fail when email already exists', async () => {
            // Create first user
            await request(app)
                .post('/api/user/createUser')
                .send({
                    username: 'user1',
                    email: 'same@test.com',
                    password: 'password123',
                    role: 'superadmin'
                });

            // Try to create another user with same email
            const res = await request(app)
                .post('/api/user/createUser')
                .send({
                    username: 'user2',
                    email: 'same@test.com',
                    password: 'password123',
                    role: 'superadmin'
                });

            expect(res.body.error).toBe('User with this email or username already exists');
        });

        it('should fail with invalid email format', async () => {
            const res = await request(app)
                .post('/api/user/createUser')
                .send({
                    username: 'testuser',
                    email: 'invalid-email',
                    password: 'password123',
                    role: 'superadmin'
                });

            expect(res.body.errors).toBeDefined();
        });

        it('should fail with short password', async () => {
            const res = await request(app)
                .post('/api/user/createUser')
                .send({
                    username: 'testuser',
                    email: 'test@test.com',
                    password: '123',
                    role: 'superadmin'
                });

            expect(res.body.errors).toBeDefined();
        });
    });

    describe('POST /api/user/login', () => {
        beforeEach(async () => {
            // Create a user for login tests
            await request(app)
                .post('/api/user/createUser')
                .send({
                    username: 'loginuser',
                    email: 'login@test.com',
                    password: 'password123',
                    role: 'superadmin'
                });
        });

        it('should login successfully with valid credentials', async () => {
            const res = await request(app)
                .post('/api/user/login')
                .send({
                    email: 'login@test.com',
                    password: 'password123'
                });

            expect(res.body.ok).not.toBe(false);
            expect(res.body.user).toBeDefined();
            expect(res.body.user.email).toBe('login@test.com');
            expect(res.body.longToken).toBeDefined();
        });

        it('should fail with wrong password', async () => {
            const res = await request(app)
                .post('/api/user/login')
                .send({
                    email: 'login@test.com',
                    password: 'wrongpassword'
                });

            expect(res.body.error).toBe('Invalid email or password');
        });

        it('should fail with non-existent email', async () => {
            const res = await request(app)
                .post('/api/user/login')
                .send({
                    email: 'nonexistent@test.com',
                    password: 'password123'
                });

            expect(res.body.error).toBe('Invalid email or password');
        });

        it('should fail when email is missing', async () => {
            const res = await request(app)
                .post('/api/user/login')
                .send({
                    password: 'password123'
                });

            expect(res.body.error).toBe('Email and password are required');
        });

        it('should fail when password is missing', async () => {
            const res = await request(app)
                .post('/api/user/login')
                .send({
                    email: 'login@test.com'
                });

            expect(res.body.error).toBe('Email and password are required');
        });
    });

    describe('GET /api/user/getUserProfile', () => {
        let token;

        beforeEach(async () => {
            const result = await createSuperadminAndLogin(request, app);
            token = result.token;
        });

        it('should get user profile with valid token', async () => {
            const res = await request(app)
                .get('/api/user/getUserProfile')
                .set('Authorization', `Bearer ${token}`);

            expect(res.body.user).toBeDefined();
            expect(res.body.user.username).toBe('superadmin');
            expect(res.body.user.email).toBe('superadmin@test.com');
        });

        it('should fail without authorization header', async () => {
            const res = await request(app)
                .get('/api/user/getUserProfile');

            expect(res.body.error).toBeDefined();
        });

        it('should fail with invalid token', async () => {
            const res = await request(app)
                .get('/api/user/getUserProfile')
                .set('Authorization', 'Bearer invalid_token');

            expect(res.body.error).toBeDefined();
        });
    });

    describe('POST /api/user/updateUser', () => {
        let token;

        beforeEach(async () => {
            const result = await createSuperadminAndLogin(request, app);
            token = result.token;
        });

        it('should update username successfully', async () => {
            const res = await request(app)
                .post('/api/user/updateUser')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    username: 'newusername'
                });

            expect(res.body.user).toBeDefined();
            expect(res.body.user.username).toBe('newusername');
        });

        it('should update email successfully', async () => {
            const res = await request(app)
                .post('/api/user/updateUser')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    email: 'newemail@test.com'
                });

            expect(res.body.user).toBeDefined();
            expect(res.body.user.email).toBe('newemail@test.com');
        });

        it('should update password successfully', async () => {
            // Update password
            await request(app)
                .post('/api/user/updateUser')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    password: 'newpassword123'
                });

            // Login with new password
            const loginRes = await request(app)
                .post('/api/user/login')
                .send({
                    email: 'superadmin@test.com',
                    password: 'newpassword123'
                });

            expect(loginRes.body.user).toBeDefined();
            expect(loginRes.body.longToken).toBeDefined();
        });

        it('should fail when updating to existing username', async () => {
            // Create another user
            await request(app)
                .post('/api/user/createUser')
                .send({
                    username: 'existinguser',
                    email: 'existing@test.com',
                    password: 'password123',
                    role: 'superadmin'
                });

            // Try to update to existing username
            const res = await request(app)
                .post('/api/user/updateUser')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    username: 'existinguser'
                });

            expect(res.body.error).toBe('Username or email already in use');
        });

        it('should fail without authorization', async () => {
            const res = await request(app)
                .post('/api/user/updateUser')
                .send({
                    username: 'newusername'
                });

            expect(res.body.error).toBeDefined();
        });
    });
});
