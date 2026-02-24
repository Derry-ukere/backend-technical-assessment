/**
 * Student Manager Unit Tests
 * 
 * Tests for Student.manager.js including:
 * - Student creation/enrollment
 * - Student listing with filters
 * - Student retrieval by ID
 * - Student update
 * - Student deletion (soft delete)
 * - Student transfer
 */

const mongoose = require('mongoose');
const {
    connect,
    closeDatabase,
    clearDatabase,
    createMockDependencies,
    createTestSchool,
    createTestClassroom,
    createTestStudent,
    createSuperadminToken,
    createSchoolAdminToken,
} = require('../setup');

const StudentManager = require('../../managers/entities/student/Student.manager');

describe('Student Manager', () => {
    let studentManager;
    let deps;
    let superadminToken;
    let testSchool;
    let testClassroom;

    beforeAll(async () => {
        await connect();
        deps = createMockDependencies();
        studentManager = new StudentManager(deps);
        superadminToken = createSuperadminToken();
    });

    afterAll(async () => {
        await closeDatabase();
    });

    beforeEach(async () => {
        await clearDatabase();
        testSchool = await createTestSchool(deps.mongomodels.school);
        testClassroom = await createTestClassroom(
            deps.mongomodels.classroom,
            testSchool._id,
            new mongoose.Types.ObjectId()
        );
    });

    describe('createStudent', () => {
        it('should create a student successfully as superadmin', async () => {
            const result = await studentManager.createStudent({
                schoolId: testSchool._id.toString(),
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@test.com',
                dateOfBirth: '2010-01-01',
                gender: 'male',
                guardianName: 'Jane Doe',
                guardianPhone: '123-456-7890',
                __longToken: superadminToken,
            });

            expect(result.error).toBeUndefined();
            expect(result.student).toBeDefined();
            expect(result.student.firstName).toBe('John');
            expect(result.student.lastName).toBe('Doe');
        });

        it('should create a student as school_admin for their school', async () => {
            const schoolAdminToken = createSchoolAdminToken(new mongoose.Types.ObjectId(), testSchool._id);

            const result = await studentManager.createStudent({
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane.smith@test.com',
                gender: 'female',
                __longToken: schoolAdminToken,
            });

            expect(result.error).toBeUndefined();
            expect(result.student).toBeDefined();
        });

        it('should fail when school_admin tries to create student in different school', async () => {
            const otherSchool = await createTestSchool(deps.mongomodels.school, { name: 'Other School' });
            const schoolAdminToken = createSchoolAdminToken(new mongoose.Types.ObjectId(), testSchool._id);

            const result = await studentManager.createStudent({
                schoolId: otherSchool._id.toString(),
                firstName: 'Test',
                lastName: 'Student',
                __longToken: schoolAdminToken,
            });

            expect(result.error).toBe('Access denied. You can only access students in your assigned school.');
            expect(result.code).toBe(403);
        });

        it('should fail without authentication', async () => {
            const result = await studentManager.createStudent({
                schoolId: testSchool._id.toString(),
                firstName: 'Test',
                lastName: 'Student',
            });

            expect(result.error).toBe('Authentication required');
        });
    });

    describe('getStudents', () => {
        beforeEach(async () => {
            await createTestStudent(
                deps.mongomodels.student,
                testSchool._id,
                new mongoose.Types.ObjectId(),
                { firstName: 'Alice', lastName: 'Johnson' }
            );
            await createTestStudent(
                deps.mongomodels.student,
                testSchool._id,
                new mongoose.Types.ObjectId(),
                { firstName: 'Bob', lastName: 'Wilson', email: 'bob@test.com' }
            );
        });

        it('should get students with pagination as superadmin', async () => {
            const result = await studentManager.getStudents({
                schoolId: testSchool._id.toString(),
                __longToken: superadminToken,
            });

            expect(result.error).toBeUndefined();
            expect(result.students).toBeDefined();
            expect(result.students.length).toBe(2);
        });

        it('should filter students by search term', async () => {
            const result = await studentManager.getStudents({
                schoolId: testSchool._id.toString(),
                search: 'Alice',
                __longToken: superadminToken,
            });

            expect(result.error).toBeUndefined();
            expect(result.students.length).toBe(1);
            expect(result.students[0].firstName).toBe('Alice');
        });
    });

    describe('getStudent', () => {
        let testStudent;

        beforeEach(async () => {
            testStudent = await createTestStudent(
                deps.mongomodels.student,
                testSchool._id,
                new mongoose.Types.ObjectId()
            );
        });

        it('should get a student by ID as superadmin', async () => {
            const result = await studentManager.getStudent({
                studentId: testStudent._id.toString(),
                __longToken: superadminToken,
            });

            expect(result.error).toBeUndefined();
            expect(result.student).toBeDefined();
            expect(result.student._id.toString()).toBe(testStudent._id.toString());
        });

        it('should fail with invalid student ID', async () => {
            const result = await studentManager.getStudent({
                studentId: '507f1f77bcf86cd799439011',
                __longToken: superadminToken,
            });

            expect(result.error).toBe('Student not found');
        });
    });

    describe('updateStudent', () => {
        let testStudent;

        beforeEach(async () => {
            testStudent = await createTestStudent(
                deps.mongomodels.student,
                testSchool._id,
                new mongoose.Types.ObjectId()
            );
        });

        it('should update student first name', async () => {
            const result = await studentManager.updateStudent({
                studentId: testStudent._id.toString(),
                firstName: 'UpdatedName',
                __longToken: superadminToken,
            });

            expect(result.error).toBeUndefined();
            expect(result.student.firstName).toBe('UpdatedName');
        });

        it('should fail to update non-existent student', async () => {
            const result = await studentManager.updateStudent({
                studentId: '507f1f77bcf86cd799439011',
                firstName: 'Test',
                __longToken: superadminToken,
            });

            expect(result.error).toBe('Student not found');
        });
    });

    describe('deleteStudent', () => {
        let testStudent;

        beforeEach(async () => {
            testStudent = await createTestStudent(
                deps.mongomodels.student,
                testSchool._id,
                new mongoose.Types.ObjectId()
            );
        });

        it('should soft delete a student', async () => {
            const result = await studentManager.deleteStudent({
                studentId: testStudent._id.toString(),
                __longToken: superadminToken,
            });

            expect(result.error).toBeUndefined();
            expect(result.message).toBe('Student unenrolled successfully');

            // Verify student is soft deleted
            const deletedStudent = await deps.mongomodels.student.findById(testStudent._id);
            expect(deletedStudent.isActive).toBe(false);
        });

        it('should fail to delete non-existent student', async () => {
            const result = await studentManager.deleteStudent({
                studentId: '507f1f77bcf86cd799439011',
                __longToken: superadminToken,
            });

            expect(result.error).toBe('Student not found');
        });
    });
});
