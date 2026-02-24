/**
 * Student API Integration Tests
 * 
 * Tests the full Student CRUD operations through the API including:
 * - Create/enroll student
 * - Get all students
 * - Get single student
 * - Update student
 * - Delete student
 * - Transfer student
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
    createTestStudent,
} = require('./setup.integration');

describe('Student API', () => {
    let app;
    let managers;
    let superadminToken;
    let schoolAdminToken;
    let school;
    let classroom;

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
        
        // Create a classroom
        classroom = await createTestClassroom(request, app, superadminToken, school._id);
        
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

    describe('POST /api/student/createStudent', () => {
        it('should create a student as school_admin', async () => {
            const res = await request(app)
                .post('/api/student/createStudent')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john.doe@student.com',
                    dateOfBirth: '2005-05-15',
                    gender: 'male',
                    guardianName: 'Jane Doe',
                    guardianPhone: '555-123-4567'
                });

            expect(res.body.student).toBeDefined();
            expect(res.body.student.firstName).toBe('John');
            expect(res.body.student.lastName).toBe('Doe');
            expect(res.body.student.schoolId.toString()).toBe(school._id.toString());
            expect(res.body.student.isActive).toBe(true);
        });

        it('should create a student with classroom', async () => {
            const res = await request(app)
                .post('/api/student/createStudent')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    firstName: 'Jane',
                    lastName: 'Smith',
                    email: 'jane.smith@student.com',
                    dateOfBirth: '2005-03-20',
                    gender: 'female',
                    classroomId: classroom._id,
                    guardianName: 'John Smith',
                    guardianPhone: '555-987-6543'
                });

            expect(res.body.student).toBeDefined();
            expect(res.body.student.classroomId.toString()).toBe(classroom._id.toString());
        });

        it('should create a student as superadmin', async () => {
            const res = await request(app)
                .post('/api/student/createStudent')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    firstName: 'Admin',
                    lastName: 'Created',
                    email: 'admin.created@student.com',
                    dateOfBirth: '2006-01-01',
                    gender: 'male',
                    schoolId: school._id,
                    guardianName: 'Super Admin',
                    guardianPhone: '555-000-0000'
                });

            expect(res.body.student).toBeDefined();
            expect(res.body.student.firstName).toBe('Admin');
        });

        it('should fail to create student without firstName', async () => {
            const res = await request(app)
                .post('/api/student/createStudent')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    lastName: 'Doe',
                    email: 'test@student.com',
                    dateOfBirth: '2005-05-15',
                    gender: 'male'
                });

            expect(res.body.errors || res.body.error).toBeDefined();
        });

        it('should fail to create student without lastName', async () => {
            const res = await request(app)
                .post('/api/student/createStudent')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    firstName: 'John',
                    email: 'test@student.com',
                    dateOfBirth: '2005-05-15',
                    gender: 'male'
                });

            expect(res.body.errors || res.body.error).toBeDefined();
        });

        it('should fail to create student with duplicate email', async () => {
            // Create first student
            await request(app)
                .post('/api/student/createStudent')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    firstName: 'First',
                    lastName: 'Student',
                    email: 'duplicate@student.com',
                    dateOfBirth: '2005-05-15',
                    gender: 'male'
                });

            // Try to create duplicate
            const res = await request(app)
                .post('/api/student/createStudent')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    firstName: 'Second',
                    lastName: 'Student',
                    email: 'duplicate@student.com',
                    dateOfBirth: '2005-06-20',
                    gender: 'female'
                });

            expect(res.body.error).toBe('A student with this email already exists');
        });

        it('should fail when classroom is at full capacity', async () => {
            // Create a small classroom with capacity 1
            const smallClassroom = await createTestClassroom(request, app, schoolAdminToken, school._id, {
                name: 'Small Room',
                capacity: 1
            });

            // Enroll first student
            await request(app)
                .post('/api/student/createStudent')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    firstName: 'First',
                    lastName: 'Student',
                    email: 'first@student.com',
                    dateOfBirth: '2005-05-15',
                    gender: 'male',
                    classroomId: smallClassroom._id
                });

            // Try to enroll second student
            const res = await request(app)
                .post('/api/student/createStudent')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    firstName: 'Second',
                    lastName: 'Student',
                    email: 'second@student.com',
                    dateOfBirth: '2005-06-20',
                    gender: 'female',
                    classroomId: smallClassroom._id
                });

            expect(res.body.error).toBe('Classroom is at full capacity');
        });

        it('should fail when school_admin tries to enroll in different school', async () => {
            // Create another school
            const anotherSchool = await createTestSchool(request, app, superadminToken, {
                name: 'Another School'
            });

            const res = await request(app)
                .post('/api/student/createStudent')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@student.com',
                    dateOfBirth: '2005-05-15',
                    gender: 'male',
                    schoolId: anotherSchool._id
                });

            expect(res.body.error).toBe('Access denied. You can only access students in your assigned school.');
        });

        it('should fail without authentication', async () => {
            const res = await request(app)
                .post('/api/student/createStudent')
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@student.com',
                    dateOfBirth: '2005-05-15',
                    gender: 'male'
                });

            expect(res.body.error).toBeDefined();
        });
    });

    describe('GET /api/student/getStudents', () => {
        beforeEach(async () => {
            // Create multiple students
            for (let i = 1; i <= 5; i++) {
                await createTestStudent(request, app, schoolAdminToken, school._id, null, {
                    firstName: `Student${i}`,
                    lastName: 'Test',
                    email: `student${i}@test.com`
                });
            }
        });

        it('should get all students for school_admin', async () => {
            const res = await request(app)
                .get('/api/student/getStudents')
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(res.body.students).toBeDefined();
            expect(res.body.students.length).toBe(5);
            expect(res.body.pagination).toBeDefined();
        });

        it('should get students with pagination', async () => {
            const res = await request(app)
                .get('/api/student/getStudents')
                .query({ page: 1, limit: 2 })
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(res.body.students.length).toBe(2);
            expect(res.body.pagination.total).toBe(5);
        });

        it('should filter students by classroomId', async () => {
            // Assign some students to classroom
            const student = await createTestStudent(request, app, schoolAdminToken, school._id, classroom._id, {
                firstName: 'ClassStudent',
                lastName: 'Test',
                email: 'classstudent@test.com'
            });

            const res = await request(app)
                .get('/api/student/getStudents')
                .query({ classroomId: classroom._id })
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(res.body.students).toBeDefined();
            res.body.students.forEach(s => {
                expect(s.classroomId.toString()).toBe(classroom._id.toString());
            });
        });

        it('should search students by name', async () => {
            const res = await request(app)
                .get('/api/student/getStudents')
                .query({ search: 'Student1' })
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(res.body.students).toBeDefined();
            expect(res.body.students.length).toBeGreaterThan(0);
        });

        it('should fail without authentication', async () => {
            const res = await request(app)
                .get('/api/student/getStudents');

            expect(res.body.error).toBeDefined();
        });
    });

    describe('GET /api/student/getStudent', () => {
        let student;

        beforeEach(async () => {
            student = await createTestStudent(request, app, schoolAdminToken, school._id, classroom._id);
        });

        it('should get a single student by ID', async () => {
            const res = await request(app)
                .get('/api/student/getStudent')
                .query({ studentId: student._id })
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(res.body.student).toBeDefined();
            expect(res.body.student.firstName).toBe(student.firstName);
        });

        it('should fail with invalid studentId', async () => {
            const res = await request(app)
                .get('/api/student/getStudent')
                .query({ studentId: '507f1f77bcf86cd799439011' })
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(res.body.error).toBe('Student not found');
        });

        it('should fail without studentId', async () => {
            const res = await request(app)
                .get('/api/student/getStudent')
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(res.body.error).toBe('Student ID is required');
        });

        it('school_admin should not access student from another school', async () => {
            // Create another school and student
            const anotherSchool = await createTestSchool(request, app, superadminToken, {
                name: 'Another School'
            });
            
            const anotherStudent = await createTestStudent(request, app, superadminToken, anotherSchool._id, null, {
                firstName: 'Other',
                lastName: 'Student',
                email: 'other@test.com'
            });

            const res = await request(app)
                .get('/api/student/getStudent')
                .query({ studentId: anotherStudent._id })
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(res.body.error).toBe('Access denied. You can only access students in your assigned school.');
        });
    });

    describe('POST /api/student/updateStudent', () => {
        let student;

        beforeEach(async () => {
            student = await createTestStudent(request, app, schoolAdminToken, school._id);
        });

        it('should update student name', async () => {
            const res = await request(app)
                .post('/api/student/updateStudent')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    studentId: student._id,
                    firstName: 'Updated',
                    lastName: 'Name'
                });

            expect(res.body.student).toBeDefined();
            expect(res.body.student.firstName).toBe('Updated');
            expect(res.body.student.lastName).toBe('Name');
        });

        it('should update student email', async () => {
            const res = await request(app)
                .post('/api/student/updateStudent')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    studentId: student._id,
                    email: 'newemail@student.com'
                });

            expect(res.body.student.email).toBe('newemail@student.com');
        });

        it('should update student classroom', async () => {
            const newClassroom = await createTestClassroom(request, app, schoolAdminToken, school._id, {
                name: 'New Classroom'
            });

            const res = await request(app)
                .post('/api/student/updateStudent')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    studentId: student._id,
                    classroomId: newClassroom._id
                });

            expect(res.body.student.classroomId.toString()).toBe(newClassroom._id.toString());
        });

        it('should fail without studentId', async () => {
            const res = await request(app)
                .post('/api/student/updateStudent')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({ firstName: 'Updated' });

            expect(res.body.error).toBe('Student ID is required');
        });

        it('should fail to update to duplicate email', async () => {
            // Create another student
            await createTestStudent(request, app, schoolAdminToken, school._id, null, {
                email: 'existing@student.com'
            });

            // Try to update to existing email
            const res = await request(app)
                .post('/api/student/updateStudent')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    studentId: student._id,
                    email: 'existing@student.com'
                });

            expect(res.body.error).toBe('A student with this email already exists');
        });
    });

    describe('POST /api/student/deleteStudent', () => {
        let student;

        beforeEach(async () => {
            student = await createTestStudent(request, app, schoolAdminToken, school._id);
        });

        it('should soft delete a student', async () => {
            const res = await request(app)
                .post('/api/student/deleteStudent')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({ studentId: student._id });

            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Student deleted successfully');

            // Verify student is soft deleted
            const getRes = await request(app)
                .get('/api/student/getStudent')
                .query({ studentId: student._id })
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(getRes.body.student.isActive).toBe(false);
        });

        it('should fail without studentId', async () => {
            const res = await request(app)
                .post('/api/student/deleteStudent')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({});

            expect(res.body.error).toBe('Student ID is required');
        });

        it('should fail with invalid studentId', async () => {
            const res = await request(app)
                .post('/api/student/deleteStudent')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({ studentId: '507f1f77bcf86cd799439011' });

            expect(res.body.error).toBe('Student not found');
        });
    });

    describe('POST /api/student/transferStudent', () => {
        let student;
        let newSchool;
        let newClassroom;

        beforeEach(async () => {
            student = await createTestStudent(request, app, schoolAdminToken, school._id, classroom._id);
            
            // Create new school and classroom for transfer
            newSchool = await createTestSchool(request, app, superadminToken, {
                name: 'New School'
            });
            newClassroom = await createTestClassroom(request, app, superadminToken, newSchool._id, {
                name: 'New Classroom'
            });
        });

        it('should transfer student to another school (superadmin)', async () => {
            const res = await request(app)
                .post('/api/student/transferStudent')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    studentId: student._id,
                    toSchoolId: newSchool._id,
                    reason: 'Family relocation'
                });

            expect(res.body.student).toBeDefined();
            expect(res.body.student.schoolId.toString()).toBe(newSchool._id.toString());
            expect(res.body.student.transferHistory).toBeDefined();
            expect(res.body.student.transferHistory.length).toBeGreaterThan(0);
        });

        it('should transfer student to another classroom in same school', async () => {
            const anotherClassroom = await createTestClassroom(request, app, schoolAdminToken, school._id, {
                name: 'Another Classroom'
            });

            const res = await request(app)
                .post('/api/student/transferStudent')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    studentId: student._id,
                    toClassroomId: anotherClassroom._id,
                    reason: 'Grade advancement'
                });

            expect(res.body.student).toBeDefined();
            expect(res.body.student.classroomId.toString()).toBe(anotherClassroom._id.toString());
        });

        it('should fail when school_admin tries to transfer to different school', async () => {
            const res = await request(app)
                .post('/api/student/transferStudent')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    studentId: student._id,
                    toSchoolId: newSchool._id,
                    reason: 'Transfer attempt'
                });

            expect(res.body.error).toBe('School admins can only transfer students within their school');
        });

        it('should fail without studentId', async () => {
            const res = await request(app)
                .post('/api/student/transferStudent')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    toSchoolId: newSchool._id
                });

            expect(res.body.error).toBe('Student ID is required');
        });

        it('should fail without transfer destination', async () => {
            const res = await request(app)
                .post('/api/student/transferStudent')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    studentId: student._id
                });

            expect(res.body.error).toBe('At least one of toSchoolId or toClassroomId is required');
        });

        it('should include transfer history', async () => {
            // Transfer once
            await request(app)
                .post('/api/student/transferStudent')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    studentId: student._id,
                    toSchoolId: newSchool._id,
                    reason: 'First transfer'
                });

            // Get student to check history
            const res = await request(app)
                .get('/api/student/getStudent')
                .query({ studentId: student._id })
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(res.body.student.transferHistory).toBeDefined();
            expect(res.body.student.transferHistory.length).toBe(1);
            expect(res.body.student.transferHistory[0].reason).toBe('First transfer');
        });
    });
});
