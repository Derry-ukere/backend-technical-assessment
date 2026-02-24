/**
 * Classroom Manager Unit Tests
 * 
 * Tests for Classroom.manager.js including:
 * - Classroom creation
 * - Classroom listing with filters
 * - Classroom retrieval by ID
 * - Classroom update
 * - Classroom deletion (soft delete)
 */

const mongoose = require('mongoose');
const {
    connect,
    closeDatabase,
    clearDatabase,
    createMockDependencies,
    createTestSchool,
    createTestClassroom,
    createSuperadminToken,
    createSchoolAdminToken,
} = require('../setup');

const ClassroomManager = require('../../managers/entities/classroom/Classroom.manager');

describe('Classroom Manager', () => {
    let classroomManager;
    let deps;
    let superadminToken;
    let testSchool;

    beforeAll(async () => {
        await connect();
        deps = createMockDependencies();
        classroomManager = new ClassroomManager(deps);
        superadminToken = createSuperadminToken();
    });

    afterAll(async () => {
        await closeDatabase();
    });

    beforeEach(async () => {
        await clearDatabase();
        testSchool = await createTestSchool(deps.mongomodels.school);
    });

    describe('createClassroom', () => {
        it('should create a classroom successfully as superadmin', async () => {
            const result = await classroomManager.createClassroom({
                schoolId: testSchool._id.toString(),
                name: 'Class A',
                capacity: 30,
                grade: '10th',
                section: 'A',
                academicYear: '2024-2025',
                __longToken: superadminToken,
            });

            expect(result.error).toBeUndefined();
            expect(result.classroom).toBeDefined();
            expect(result.classroom.name).toBe('Class A');
            expect(result.classroom.capacity).toBe(30);
            expect(result.classroom.schoolId.toString()).toBe(testSchool._id.toString());
        });

        it('should create a classroom successfully as school_admin for their school', async () => {
            const schoolAdminToken = createSchoolAdminToken(new mongoose.Types.ObjectId(), testSchool._id);

            const result = await classroomManager.createClassroom({
                name: 'Class B',
                capacity: 25,
                grade: '9th',
                __longToken: schoolAdminToken,
            });

            expect(result.error).toBeUndefined();
            expect(result.classroom).toBeDefined();
            expect(result.classroom.name).toBe('Class B');
        });

        it('should fail when school_admin tries to create classroom in different school', async () => {
            const otherSchool = await createTestSchool(deps.mongomodels.school, { name: 'Other School' });
            const schoolAdminToken = createSchoolAdminToken(new mongoose.Types.ObjectId(), testSchool._id);

            const result = await classroomManager.createClassroom({
                schoolId: otherSchool._id.toString(),
                name: 'Class C',
                capacity: 20,
                __longToken: schoolAdminToken,
            });

            expect(result.error).toBe('Access denied. You can only access your assigned school.');
            expect(result.code).toBe(403);
        });

        it('should fail when superadmin does not specify schoolId', async () => {
            const result = await classroomManager.createClassroom({
                name: 'Class D',
                capacity: 30,
                __longToken: superadminToken,
            });

            expect(result.error).toBe('School ID is required for superadmin');
        });

        it('should fail with duplicate classroom name in same school', async () => {
            await classroomManager.createClassroom({
                schoolId: testSchool._id.toString(),
                name: 'Duplicate Class',
                capacity: 30,
                __longToken: superadminToken,
            });

            const result = await classroomManager.createClassroom({
                schoolId: testSchool._id.toString(),
                name: 'Duplicate Class',
                capacity: 25,
                __longToken: superadminToken,
            });

            expect(result.error).toContain('A classroom with this name already exists');
        });

        it('should allow same classroom name in different schools', async () => {
            const otherSchool = await createTestSchool(deps.mongomodels.school, { name: 'Other School' });

            await classroomManager.createClassroom({
                schoolId: testSchool._id.toString(),
                name: 'Class A',
                capacity: 30,
                __longToken: superadminToken,
            });

            const result = await classroomManager.createClassroom({
                schoolId: otherSchool._id.toString(),
                name: 'Class A',
                capacity: 30,
                __longToken: superadminToken,
            });

            expect(result.error).toBeUndefined();
            expect(result.classroom).toBeDefined();
        });

        it('should fail with invalid school ID', async () => {
            const result = await classroomManager.createClassroom({
                schoolId: '507f1f77bcf86cd799439011',
                name: 'Class E',
                capacity: 30,
                __longToken: superadminToken,
            });

            expect(result.error).toBe('School not found');
        });

        it('should fail with validation errors for invalid capacity', async () => {
            const result = await classroomManager.createClassroom({
                schoolId: testSchool._id.toString(),
                name: 'Class F',
                capacity: -5,
                __longToken: superadminToken,
            });

            expect(result.errors).toBeDefined();
        });

        it('should fail without authentication', async () => {
            const result = await classroomManager.createClassroom({
                schoolId: testSchool._id.toString(),
                name: 'Class G',
                capacity: 30,
            });

            expect(result.error).toBe('Authentication required');
        });
    });

    describe('getClassrooms', () => {
        beforeEach(async () => {
            // Create multiple classrooms
            for (let i = 1; i <= 15; i++) {
                await deps.mongomodels.classroom.create({
                    name: `Classroom ${i}`,
                    schoolId: testSchool._id,
                    capacity: 30,
                    grade: `Grade ${i % 5 + 1}`,
                    isActive: i <= 10,
                    createdBy: new mongoose.Types.ObjectId(),
                });
            }
        });

        it('should get classrooms with pagination as superadmin', async () => {
            const result = await classroomManager.getClassrooms({
                schoolId: testSchool._id.toString(),
                __longToken: superadminToken,
            });

            expect(result.error).toBeUndefined();
            expect(result.classrooms).toBeDefined();
            expect(result.classrooms.length).toBe(10); // Default limit
            expect(result.pagination).toBeDefined();
        });

        it('should get classrooms for school_admin of that school', async () => {
            const schoolAdminToken = createSchoolAdminToken(new mongoose.Types.ObjectId(), testSchool._id);

            const result = await classroomManager.getClassrooms({
                __longToken: schoolAdminToken,
            });

            expect(result.error).toBeUndefined();
            expect(result.classrooms).toBeDefined();
        });

        it('should filter by active status', async () => {
            const result = await classroomManager.getClassrooms({
                schoolId: testSchool._id.toString(),
                isActive: true,
                __longToken: superadminToken,
            });

            expect(result.classrooms.every(c => c.isActive)).toBe(true);
            expect(result.pagination.total).toBe(10);
        });

        it('should filter by grade', async () => {
            const result = await classroomManager.getClassrooms({
                schoolId: testSchool._id.toString(),
                grade: 'Grade 1',
                __longToken: superadminToken,
            });

            expect(result.classrooms.every(c => c.grade === 'Grade 1')).toBe(true);
        });

        it('should search by name', async () => {
            const result = await classroomManager.getClassrooms({
                schoolId: testSchool._id.toString(),
                search: 'Classroom 1',
                __longToken: superadminToken,
            });

            expect(result.classrooms.length).toBeGreaterThan(0);
            expect(result.classrooms.every(c => c.name.includes('Classroom 1'))).toBe(true);
        });
    });

    describe('getClassroom', () => {
        let testClassroom;

        beforeEach(async () => {
            testClassroom = await createTestClassroom(
                deps.mongomodels.classroom,
                testSchool._id,
                new mongoose.Types.ObjectId()
            );
        });

        it('should get a classroom by ID as superadmin', async () => {
            const result = await classroomManager.getClassroom({
                classroomId: testClassroom._id.toString(),
                __longToken: superadminToken,
            });

            expect(result.error).toBeUndefined();
            expect(result.classroom).toBeDefined();
            expect(result.classroom.name).toBe(testClassroom.name);
        });

        it('should get a classroom as school_admin of that school', async () => {
            const schoolAdminToken = createSchoolAdminToken(new mongoose.Types.ObjectId(), testSchool._id);

            const result = await classroomManager.getClassroom({
                classroomId: testClassroom._id.toString(),
                __longToken: schoolAdminToken,
            });

            expect(result.error).toBeUndefined();
            expect(result.classroom).toBeDefined();
        });

        it('should fail for school_admin trying to access classroom from different school', async () => {
            const otherSchool = await createTestSchool(deps.mongomodels.school, { name: 'Other School' });
            const schoolAdminToken = createSchoolAdminToken(new mongoose.Types.ObjectId(), otherSchool._id);

            const result = await classroomManager.getClassroom({
                classroomId: testClassroom._id.toString(),
                __longToken: schoolAdminToken,
            });

            expect(result.error).toBe('Access denied. You can only access your assigned school.');
        });

        it('should fail with invalid classroom ID', async () => {
            const result = await classroomManager.getClassroom({
                classroomId: '507f1f77bcf86cd799439011',
                __longToken: superadminToken,
            });

            expect(result.error).toBe('Classroom not found');
        });
    });

    describe('updateClassroom', () => {
        let testClassroom;

        beforeEach(async () => {
            testClassroom = await createTestClassroom(
                deps.mongomodels.classroom,
                testSchool._id,
                new mongoose.Types.ObjectId()
            );
        });

        it('should update classroom name', async () => {
            const result = await classroomManager.updateClassroom({
                classroomId: testClassroom._id.toString(),
                name: 'Updated Classroom',
                __longToken: superadminToken,
            });

            expect(result.error).toBeUndefined();
            expect(result.classroom.name).toBe('Updated Classroom');
        });

        it('should update capacity', async () => {
            const result = await classroomManager.updateClassroom({
                classroomId: testClassroom._id.toString(),
                capacity: 50,
                __longToken: superadminToken,
            });

            expect(result.error).toBeUndefined();
            expect(result.classroom.capacity).toBe(50);
        });

        it('should update as school_admin of that school', async () => {
            const schoolAdminToken = createSchoolAdminToken(new mongoose.Types.ObjectId(), testSchool._id);

            const result = await classroomManager.updateClassroom({
                classroomId: testClassroom._id.toString(),
                name: 'Admin Updated',
                __longToken: schoolAdminToken,
            });

            expect(result.error).toBeUndefined();
            expect(result.classroom.name).toBe('Admin Updated');
        });

        it('should fail for school_admin updating classroom from different school', async () => {
            const otherSchool = await createTestSchool(deps.mongomodels.school, { name: 'Other School' });
            const schoolAdminToken = createSchoolAdminToken(new mongoose.Types.ObjectId(), otherSchool._id);

            const result = await classroomManager.updateClassroom({
                classroomId: testClassroom._id.toString(),
                name: 'Should Fail',
                __longToken: schoolAdminToken,
            });

            expect(result.error).toBe('Access denied. You can only access your assigned school.');
        });

        it('should fail to update non-existent classroom', async () => {
            const result = await classroomManager.updateClassroom({
                classroomId: '507f1f77bcf86cd799439011',
                name: 'New Name',
                __longToken: superadminToken,
            });

            expect(result.error).toBe('Classroom not found');
        });
    });

    describe('deleteClassroom', () => {
        let testClassroom;

        beforeEach(async () => {
            testClassroom = await createTestClassroom(
                deps.mongomodels.classroom,
                testSchool._id,
                new mongoose.Types.ObjectId()
            );
        });

        it('should soft delete a classroom', async () => {
            const result = await classroomManager.deleteClassroom({
                classroomId: testClassroom._id.toString(),
                __longToken: superadminToken,
            });

            expect(result.error).toBeUndefined();
            expect(result.message).toContain('deleted successfully');

            // Verify soft delete
            const classroom = await deps.mongomodels.classroom.findById(testClassroom._id);
            expect(classroom.isActive).toBe(false);
        });

        it('should delete as school_admin of that school', async () => {
            const schoolAdminToken = createSchoolAdminToken(new mongoose.Types.ObjectId(), testSchool._id);

            const result = await classroomManager.deleteClassroom({
                classroomId: testClassroom._id.toString(),
                __longToken: schoolAdminToken,
            });

            expect(result.error).toBeUndefined();
        });

        it('should fail for school_admin deleting classroom from different school', async () => {
            const otherSchool = await createTestSchool(deps.mongomodels.school, { name: 'Other School' });
            const schoolAdminToken = createSchoolAdminToken(new mongoose.Types.ObjectId(), otherSchool._id);

            const result = await classroomManager.deleteClassroom({
                classroomId: testClassroom._id.toString(),
                __longToken: schoolAdminToken,
            });

            expect(result.error).toBe('Access denied. You can only access your assigned school.');
        });

        it('should fail to delete already deleted classroom', async () => {
            await classroomManager.deleteClassroom({
                classroomId: testClassroom._id.toString(),
                __longToken: superadminToken,
            });

            const result = await classroomManager.deleteClassroom({
                classroomId: testClassroom._id.toString(),
                __longToken: superadminToken,
            });

            expect(result.error).toBe('Classroom is already inactive');
        });
    });
});
