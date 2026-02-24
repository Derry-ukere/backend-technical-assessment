/**
 * Classroom API Integration Tests
 * 
 * Tests the full Classroom CRUD operations through the API including:
 * - Create classroom
 * - Get all classrooms
 * - Get single classroom
 * - Update classroom
 * - Delete classroom
 * - Role-based access control (superadmin and school_admin)
 */

const request = require('supertest');
const {
    setupIntegrationTests,
    teardownIntegrationTests,
    clearAllCollections,
    createSuperadminAndLogin,
    createTestSchool,
    createTestClassroom,
} = require('./setup.integration');

describe('Classroom API', () => {
    let app;
    let managers;
    let superadminToken;
    let schoolAdminToken;
    let school;

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
        
        // Create superadmin
        const superadminResult = await createSuperadminAndLogin(request, app);
        superadminToken = superadminResult.token;
        
        // Create a school
        school = await createTestSchool(request, app, superadminToken);
        
        // Create school admin
        const schoolAdminRes = await request(app)
            .post('/api/user/createUser')
            .send({
                username: 'schooladmin',
                email: 'schooladmin@test.com',
                password: 'password123',
                role: 'school_admin',
                schoolId: school._id
            });
        schoolAdminToken = schoolAdminRes.body.longToken;
    });

    describe('POST /api/classroom/createClassroom', () => {
        it('should create a classroom as superadmin', async () => {
            const res = await request(app)
                .post('/api/classroom/createClassroom')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    schoolId: school._id,
                    name: 'Room 101',
                    capacity: 30,
                    grade: '10th',
                    section: 'A',
                    academicYear: '2024-2025'
                });

            expect(res.body.classroom).toBeDefined();
            expect(res.body.classroom.name).toBe('Room 101');
            expect(res.body.classroom.capacity).toBe(30);
            expect(res.body.classroom.grade).toBe('10th');
            expect(res.body.classroom.isActive).toBe(true);
        });

        it('should create a classroom as school_admin', async () => {
            const res = await request(app)
                .post('/api/classroom/createClassroom')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    name: 'Room 102',
                    capacity: 25,
                    grade: '9th',
                    section: 'B'
                });

            expect(res.body.classroom).toBeDefined();
            expect(res.body.classroom.name).toBe('Room 102');
            expect(res.body.classroom.schoolId.toString()).toBe(school._id.toString());
        });

        it('should fail to create classroom without name', async () => {
            const res = await request(app)
                .post('/api/classroom/createClassroom')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    capacity: 30,
                    grade: '10th'
                });

            expect(res.body.errors || res.body.error).toBeDefined();
        });

        it('should fail to create classroom without capacity', async () => {
            const res = await request(app)
                .post('/api/classroom/createClassroom')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    name: 'Room 103',
                    grade: '10th'
                });

            expect(res.body.errors || res.body.error).toBeDefined();
        });

        it('should fail to create duplicate classroom in same school', async () => {
            // Create first classroom
            await request(app)
                .post('/api/classroom/createClassroom')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    name: 'Room A',
                    capacity: 30,
                    academicYear: '2024-2025'
                });

            // Create duplicate
            const res = await request(app)
                .post('/api/classroom/createClassroom')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    name: 'Room A',
                    capacity: 25,
                    academicYear: '2024-2025'
                });

            expect(res.body.error).toMatch(/classroom with this name already exists/);
        });

        it('should fail when school_admin tries to access different school', async () => {
            // Create another school
            const anotherSchool = await createTestSchool(request, app, superadminToken, {
                name: 'Another School'
            });

            const res = await request(app)
                .post('/api/classroom/createClassroom')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    schoolId: anotherSchool._id,
                    name: 'Room 103',
                    capacity: 30
                });

            expect(res.body.error).toBe('Access denied. You can only access your assigned school.');
        });

        it('should fail without authentication', async () => {
            const res = await request(app)
                .post('/api/classroom/createClassroom')
                .send({
                    name: 'Room 104',
                    capacity: 30
                });

            expect(res.body.error).toBeDefined();
        });
    });

    describe('GET /api/classroom/getClassrooms', () => {
        beforeEach(async () => {
            // Create multiple classrooms
            for (let i = 1; i <= 5; i++) {
                await createTestClassroom(request, app, schoolAdminToken, school._id, {
                    name: `Classroom ${i}`,
                    grade: `${9 + (i % 3)}th`
                });
            }
        });

        it('should get all classrooms for school_admin', async () => {
            const res = await request(app)
                .get('/api/classroom/getClassrooms')
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(res.body.classrooms).toBeDefined();
            expect(res.body.classrooms.length).toBe(5);
            expect(res.body.pagination).toBeDefined();
        });

        it('should get classrooms with pagination', async () => {
            const res = await request(app)
                .get('/api/classroom/getClassrooms')
                .query({ page: 1, limit: 2 })
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(res.body.classrooms.length).toBe(2);
            expect(res.body.pagination.total).toBe(5);
        });

        it('should filter classrooms by grade', async () => {
            const res = await request(app)
                .get('/api/classroom/getClassrooms')
                .query({ grade: '10th' })
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(res.body.classrooms).toBeDefined();
            res.body.classrooms.forEach(classroom => {
                expect(classroom.grade).toBe('10th');
            });
        });

        it('should search classrooms by name', async () => {
            const res = await request(app)
                .get('/api/classroom/getClassrooms')
                .query({ search: 'Classroom 1' })
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(res.body.classrooms).toBeDefined();
            res.body.classrooms.forEach(classroom => {
                expect(classroom.name).toMatch(/Classroom 1/);
            });
        });

        it('should fail without authentication', async () => {
            const res = await request(app)
                .get('/api/classroom/getClassrooms');

            expect(res.body.error).toBeDefined();
        });
    });

    describe('GET /api/classroom/getClassroom', () => {
        let classroom;

        beforeEach(async () => {
            classroom = await createTestClassroom(request, app, schoolAdminToken, school._id);
        });

        it('should get a single classroom by ID', async () => {
            const res = await request(app)
                .get('/api/classroom/getClassroom')
                .query({ classroomId: classroom._id })
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(res.body.classroom).toBeDefined();
            expect(res.body.classroom.name).toBe(classroom.name);
            expect(res.body.classroom.studentCount).toBeDefined();
        });

        it('should fail with invalid classroomId', async () => {
            const res = await request(app)
                .get('/api/classroom/getClassroom')
                .query({ classroomId: '507f1f77bcf86cd799439011' })
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(res.body.error).toBe('Classroom not found');
        });

        it('should fail without classroomId', async () => {
            const res = await request(app)
                .get('/api/classroom/getClassroom')
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(res.body.error).toBe('Classroom ID is required');
        });

        it('school_admin should not access classroom from another school', async () => {
            // Create another school and classroom
            const anotherSchool = await createTestSchool(request, app, superadminToken, {
                name: 'Another School'
            });
            
            const anotherClassroom = await createTestClassroom(request, app, superadminToken, anotherSchool._id, {
                name: 'Other Classroom'
            });

            const res = await request(app)
                .get('/api/classroom/getClassroom')
                .query({ classroomId: anotherClassroom._id })
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(res.body.error).toBe('Access denied. You can only access your assigned school.');
        });
    });

    describe('POST /api/classroom/updateClassroom', () => {
        let classroom;

        beforeEach(async () => {
            classroom = await createTestClassroom(request, app, schoolAdminToken, school._id);
        });

        it('should update classroom name', async () => {
            const res = await request(app)
                .post('/api/classroom/updateClassroom')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    classroomId: classroom._id,
                    name: 'Updated Classroom'
                });

            expect(res.body.classroom).toBeDefined();
            expect(res.body.classroom.name).toBe('Updated Classroom');
        });

        it('should update classroom capacity', async () => {
            const res = await request(app)
                .post('/api/classroom/updateClassroom')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    classroomId: classroom._id,
                    capacity: 50
                });

            expect(res.body.classroom.capacity).toBe(50);
        });

        it('should update multiple fields', async () => {
            const res = await request(app)
                .post('/api/classroom/updateClassroom')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    classroomId: classroom._id,
                    name: 'Room 999',
                    grade: '12th',
                    section: 'Z'
                });

            expect(res.body.classroom.name).toBe('Room 999');
            expect(res.body.classroom.grade).toBe('12th');
            expect(res.body.classroom.section).toBe('Z');
        });

        it('should fail without classroomId', async () => {
            const res = await request(app)
                .post('/api/classroom/updateClassroom')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({ name: 'Updated' });

            expect(res.body.error).toBe('Classroom ID is required');
        });

        it('should fail to update to duplicate name', async () => {
            // Create another classroom
            await createTestClassroom(request, app, schoolAdminToken, school._id, {
                name: 'Existing Room'
            });

            // Try to rename to existing name
            const res = await request(app)
                .post('/api/classroom/updateClassroom')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    classroomId: classroom._id,
                    name: 'Existing Room'
                });

            expect(res.body.error).toMatch(/classroom with this name already exists/);
        });
    });

    describe('POST /api/classroom/deleteClassroom', () => {
        let classroom;

        beforeEach(async () => {
            classroom = await createTestClassroom(request, app, schoolAdminToken, school._id);
        });

        it('should soft delete a classroom', async () => {
            const res = await request(app)
                .post('/api/classroom/deleteClassroom')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({ classroomId: classroom._id });

            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Classroom deleted successfully');

            // Verify classroom is soft deleted
            const getRes = await request(app)
                .get('/api/classroom/getClassroom')
                .query({ classroomId: classroom._id })
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(getRes.body.classroom.isActive).toBe(false);
        });

        it('should fail without classroomId', async () => {
            const res = await request(app)
                .post('/api/classroom/deleteClassroom')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({});

            expect(res.body.error).toBe('Classroom ID is required');
        });

        it('should fail with invalid classroomId', async () => {
            const res = await request(app)
                .post('/api/classroom/deleteClassroom')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({ classroomId: '507f1f77bcf86cd799439011' });

            expect(res.body.error).toBe('Classroom not found');
        });

        it('school_admin should not delete classroom from another school', async () => {
            // Create another school and classroom
            const anotherSchool = await createTestSchool(request, app, superadminToken, {
                name: 'Another School'
            });
            
            const anotherClassroom = await createTestClassroom(request, app, superadminToken, anotherSchool._id, {
                name: 'Other Classroom'
            });

            const res = await request(app)
                .post('/api/classroom/deleteClassroom')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({ classroomId: anotherClassroom._id });

            expect(res.body.error).toBe('Access denied. You can only access your assigned school.');
        });
    });
});
