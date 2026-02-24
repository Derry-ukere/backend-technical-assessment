/**
 * School API Integration Tests
 * 
 * Tests the full School CRUD operations through the API including:
 * - Create school
 * - Get all schools
 * - Get single school
 * - Update school
 * - Delete school
 * - Role-based access control (superadmin only)
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

describe('School API', () => {
    let app;
    let managers;
    let superadminToken;

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
        // Create superadmin for each test
        const result = await createSuperadminAndLogin(request, app);
        superadminToken = result.token;
    });

    describe('POST /api/school/createSchool', () => {
        it('should create a school successfully as superadmin', async () => {
            const res = await request(app)
                .post('/api/school/createSchool')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    name: 'Springfield Elementary',
                    address: '101 Main Street',
                    phone: '555-123-4567',
                    email: 'info@springfield.edu',
                    principal: 'Seymour Skinner',
                    establishedYear: 1960
                });

            expect(res.body.ok).not.toBe(false);
            expect(res.body.school).toBeDefined();
            expect(res.body.school.name).toBe('Springfield Elementary');
            expect(res.body.school.address).toBe('101 Main Street');
            expect(res.body.school.principal).toBe('Seymour Skinner');
            expect(res.body.school.isActive).toBe(true);
        });

        it('should create a school with minimal required fields', async () => {
            const res = await request(app)
                .post('/api/school/createSchool')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    name: 'Minimal School'
                });

            expect(res.body.school).toBeDefined();
            expect(res.body.school.name).toBe('Minimal School');
        });

        it('should fail to create school without name', async () => {
            const res = await request(app)
                .post('/api/school/createSchool')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    address: '123 Street',
                    phone: '555-555-5555'
                });

            expect(res.body.errors || res.body.error).toBeDefined();
        });

        it('should fail to create duplicate school name', async () => {
            // Create first school
            await request(app)
                .post('/api/school/createSchool')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({ name: 'Unique School' });

            // Try to create duplicate
            const res = await request(app)
                .post('/api/school/createSchool')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({ name: 'Unique School' });

            expect(res.body.error).toBe('A school with this name already exists');
        });

        it('should fail without authentication', async () => {
            const res = await request(app)
                .post('/api/school/createSchool')
                .send({ name: 'Test School' });

            expect(res.body.error).toBeDefined();
        });

        it('should fail when school_admin tries to create school', async () => {
            // First create a school and school admin
            const school = await createTestSchool(request, app, superadminToken);
            
            // Create school admin
            const createRes = await request(app)
                .post('/api/user/createUser')
                .send({
                    username: 'schooladmin',
                    email: 'schooladmin@test.com',
                    password: 'password123',
                    role: 'school_admin',
                    schoolId: school._id
                });

            const schoolAdminToken = createRes.body.longToken;

            // Try to create school as school admin
            const res = await request(app)
                .post('/api/school/createSchool')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({ name: 'Unauthorized School' });

            expect(res.body.error).toBe('Access denied. Only superadmins can manage schools.');
        });
    });

    describe('GET /api/school/getSchools', () => {
        beforeEach(async () => {
            // Create multiple schools for pagination tests
            for (let i = 1; i <= 15; i++) {
                await createTestSchool(request, app, superadminToken, {
                    name: `School ${i}`,
                    address: `${i} Main Street`
                });
            }
        });

        it('should get all schools with pagination', async () => {
            const res = await request(app)
                .get('/api/school/getSchools')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(res.body.schools).toBeDefined();
            expect(res.body.schools.length).toBe(10); // Default limit
            expect(res.body.pagination).toBeDefined();
            expect(res.body.pagination.total).toBe(15);
            expect(res.body.pagination.pages).toBe(2);
        });

        it('should get schools with custom pagination', async () => {
            const res = await request(app)
                .get('/api/school/getSchools')
                .query({ page: 2, limit: 5 })
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(res.body.schools.length).toBe(5);
            expect(res.body.pagination.page).toBe(2);
            expect(res.body.pagination.limit).toBe(5);
        });

        it('should search schools by name', async () => {
            const res = await request(app)
                .get('/api/school/getSchools')
                .query({ search: 'School 1' })
                .set('Authorization', `Bearer ${superadminToken}`);

            // Should match School 1, School 10-15
            expect(res.body.schools.length).toBeGreaterThan(0);
            res.body.schools.forEach(school => {
                expect(school.name).toMatch(/School 1/);
            });
        });

        it('should filter schools by active status', async () => {
            const res = await request(app)
                .get('/api/school/getSchools')
                .query({ isActive: true })
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(res.body.schools.length).toBe(10);
            res.body.schools.forEach(school => {
                expect(school.isActive).toBe(true);
            });
        });

        it('should fail without authentication', async () => {
            const res = await request(app)
                .get('/api/school/getSchools');

            expect(res.body.error).toBeDefined();
        });
    });

    describe('GET /api/school/getSchool', () => {
        let school;

        beforeEach(async () => {
            school = await createTestSchool(request, app, superadminToken);
        });

        it('should get a single school by ID', async () => {
            const res = await request(app)
                .get('/api/school/getSchool')
                .query({ schoolId: school._id })
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(res.body.school).toBeDefined();
            expect(res.body.school.name).toBe(school.name);
            expect(res.body.school.classroomCount).toBeDefined();
            expect(res.body.school.studentCount).toBeDefined();
        });

        it('should fail with invalid schoolId', async () => {
            const res = await request(app)
                .get('/api/school/getSchool')
                .query({ schoolId: '507f1f77bcf86cd799439011' })
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(res.body.error).toBe('School not found');
        });

        it('should fail without schoolId', async () => {
            const res = await request(app)
                .get('/api/school/getSchool')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(res.body.error).toBe('School ID is required');
        });

        it('should fail without authentication', async () => {
            const res = await request(app)
                .get('/api/school/getSchool')
                .query({ schoolId: school._id });

            expect(res.body.error).toBeDefined();
        });
    });

    describe('POST /api/school/updateSchool', () => {
        let school;

        beforeEach(async () => {
            school = await createTestSchool(request, app, superadminToken);
        });

        it('should update school name', async () => {
            const res = await request(app)
                .post('/api/school/updateSchool')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    schoolId: school._id,
                    name: 'Updated School Name'
                });

            expect(res.body.school).toBeDefined();
            expect(res.body.school.name).toBe('Updated School Name');
        });

        it('should update multiple fields', async () => {
            const res = await request(app)
                .post('/api/school/updateSchool')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    schoolId: school._id,
                    address: 'New Address',
                    phone: '999-999-9999',
                    principal: 'New Principal'
                });

            expect(res.body.school.address).toBe('New Address');
            expect(res.body.school.phone).toBe('999-999-9999');
            expect(res.body.school.principal).toBe('New Principal');
        });

        it('should fail without schoolId', async () => {
            const res = await request(app)
                .post('/api/school/updateSchool')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({ name: 'Updated Name' });

            expect(res.body.error).toBe('School ID is required');
        });

        it('should fail with invalid schoolId', async () => {
            const res = await request(app)
                .post('/api/school/updateSchool')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    schoolId: '507f1f77bcf86cd799439011',
                    name: 'Updated Name'
                });

            expect(res.body.error).toBe('School not found');
        });

        it('should fail to update to duplicate name', async () => {
            // Create another school
            await createTestSchool(request, app, superadminToken, {
                name: 'Other School'
            });

            // Try to update first school to same name
            const res = await request(app)
                .post('/api/school/updateSchool')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    schoolId: school._id,
                    name: 'Other School'
                });

            expect(res.body.error).toBe('A school with this name already exists');
        });

        it('should fail without authentication', async () => {
            const res = await request(app)
                .post('/api/school/updateSchool')
                .send({
                    schoolId: school._id,
                    name: 'Updated Name'
                });

            expect(res.body.error).toBeDefined();
        });
    });

    describe('POST /api/school/deleteSchool', () => {
        let school;

        beforeEach(async () => {
            school = await createTestSchool(request, app, superadminToken);
        });

        it('should soft delete a school', async () => {
            const res = await request(app)
                .post('/api/school/deleteSchool')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({ schoolId: school._id });

            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('School deleted successfully');

            // Verify school is soft deleted
            const getRes = await request(app)
                .get('/api/school/getSchool')
                .query({ schoolId: school._id })
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(getRes.body.school.isActive).toBe(false);
        });

        it('should fail without schoolId', async () => {
            const res = await request(app)
                .post('/api/school/deleteSchool')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({});

            expect(res.body.error).toBe('School ID is required');
        });

        it('should fail with invalid schoolId', async () => {
            const res = await request(app)
                .post('/api/school/deleteSchool')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({ schoolId: '507f1f77bcf86cd799439011' });

            expect(res.body.error).toBe('School not found');
        });

        it('should fail without authentication', async () => {
            const res = await request(app)
                .post('/api/school/deleteSchool')
                .send({ schoolId: school._id });

            expect(res.body.error).toBeDefined();
        });
    });
});
