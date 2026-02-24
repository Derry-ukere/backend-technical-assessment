/**
 * School Manager Unit Tests
 * 
 * Tests for School.manager.js including:
 * - School creation (superadmin only)
 * - School listing with pagination
 * - School retrieval by ID
 * - School update
 * - School deletion (soft delete)
 */

const mongoose = require('mongoose');
const {
    connect,
    closeDatabase,
    clearDatabase,
    createMockDependencies,
    createTestSchool,
    createSuperadminToken,
    createSchoolAdminToken,
} = require('../setup');

const SchoolManager = require('../../managers/entities/school/School.manager');

describe('School Manager', () => {
    let schoolManager;
    let deps;
    let superadminToken;

    beforeAll(async () => {
        await connect();
        deps = createMockDependencies();
        schoolManager = new SchoolManager(deps);
        superadminToken = createSuperadminToken();
    });

    afterAll(async () => {
        await closeDatabase();
    });

    beforeEach(async () => {
        await clearDatabase();
    });

    describe('createSchool', () => {
        it('should create a school successfully as superadmin', async () => {
            const result = await schoolManager.createSchool({
                name: 'New School',
                address: '123 Main St',
                phone: '555-1234',
                email: 'school@example.com',
                principal: 'Dr. Smith',
                establishedYear: 2020,
                __longToken: superadminToken,
            });

            expect(result.error).toBeUndefined();
            expect(result.school).toBeDefined();
            expect(result.school.name).toBe('New School');
            expect(result.school.address).toBe('123 Main St');
            expect(result.school.isActive).toBe(true);
        });

        it('should fail to create school as school_admin', async () => {
            const schoolAdminToken = createSchoolAdminToken();

            const result = await schoolManager.createSchool({
                name: 'New School',
                address: '123 Main St',
                __longToken: schoolAdminToken,
            });

            expect(result.error).toBe('Access denied. Only superadmins can manage schools.');
            expect(result.code).toBe(403);
        });

        it('should fail with duplicate school name', async () => {
            await schoolManager.createSchool({
                name: 'Duplicate School',
                __longToken: superadminToken,
            });

            const result = await schoolManager.createSchool({
                name: 'Duplicate School',
                __longToken: superadminToken,
            });

            expect(result.error).toBe('A school with this name already exists');
        });

        it('should fail with duplicate school name (case insensitive)', async () => {
            await schoolManager.createSchool({
                name: 'Test School',
                __longToken: superadminToken,
            });

            const result = await schoolManager.createSchool({
                name: 'TEST SCHOOL',
                __longToken: superadminToken,
            });

            expect(result.error).toBe('A school with this name already exists');
        });

        it('should fail without authentication', async () => {
            const result = await schoolManager.createSchool({
                name: 'New School',
            });

            expect(result.error).toBe('Authentication required');
            expect(result.code).toBe(401);
        });

        it('should fail with validation errors for empty name', async () => {
            const result = await schoolManager.createSchool({
                name: '',
                __longToken: superadminToken,
            });

            expect(result.errors).toBeDefined();
        });
    });

    describe('getSchools', () => {
        beforeEach(async () => {
            // Create multiple test schools
            for (let i = 1; i <= 15; i++) {
                await deps.mongomodels.school.create({
                    name: `School ${i}`,
                    address: `${i} Main St`,
                    isActive: i <= 10, // First 10 are active
                    createdBy: new mongoose.Types.ObjectId(),
                });
            }
        });

        it('should get schools with default pagination', async () => {
            const result = await schoolManager.getSchools({
                __longToken: superadminToken,
            });

            expect(result.error).toBeUndefined();
            expect(result.schools).toBeDefined();
            expect(result.schools.length).toBe(10); // Default limit
            expect(result.pagination).toBeDefined();
            expect(result.pagination.page).toBe(1);
            expect(result.pagination.limit).toBe(10);
            expect(result.pagination.total).toBe(15);
        });

        it('should get schools with custom pagination', async () => {
            const result = await schoolManager.getSchools({
                page: 2,
                limit: 5,
                __longToken: superadminToken,
            });

            expect(result.schools.length).toBe(5);
            expect(result.pagination.page).toBe(2);
            expect(result.pagination.limit).toBe(5);
        });

        it('should filter schools by active status', async () => {
            const result = await schoolManager.getSchools({
                isActive: true,
                __longToken: superadminToken,
            });

            expect(result.schools.every(s => s.isActive)).toBe(true);
            expect(result.pagination.total).toBe(10);
        });

        it('should search schools by name', async () => {
            const result = await schoolManager.getSchools({
                search: 'School 1',
                __longToken: superadminToken,
            });

            expect(result.schools.length).toBeGreaterThan(0);
            expect(result.schools.every(s => s.name.includes('School 1'))).toBe(true);
        });

        it('should fail as school_admin', async () => {
            const schoolAdminToken = createSchoolAdminToken();

            const result = await schoolManager.getSchools({
                __longToken: schoolAdminToken,
            });

            expect(result.error).toBe('Access denied. Only superadmins can manage schools.');
        });
    });

    describe('getSchool', () => {
        let testSchool;

        beforeEach(async () => {
            testSchool = await createTestSchool(deps.mongomodels.school);
        });

        it('should get a school by ID', async () => {
            const result = await schoolManager.getSchool({
                schoolId: testSchool._id.toString(),
                __longToken: superadminToken,
            });

            expect(result.error).toBeUndefined();
            expect(result.school).toBeDefined();
            expect(result.school.name).toBe(testSchool.name);
        });

        it('should fail with invalid school ID', async () => {
            const result = await schoolManager.getSchool({
                schoolId: '507f1f77bcf86cd799439011',
                __longToken: superadminToken,
            });

            expect(result.error).toBe('School not found');
        });

        it('should fail without authentication', async () => {
            const result = await schoolManager.getSchool({
                schoolId: testSchool._id.toString(),
            });

            expect(result.error).toBe('Authentication required');
        });
    });

    describe('updateSchool', () => {
        let testSchool;

        beforeEach(async () => {
            testSchool = await createTestSchool(deps.mongomodels.school);
        });

        it('should update school name', async () => {
            const result = await schoolManager.updateSchool({
                schoolId: testSchool._id.toString(),
                name: 'Updated School Name',
                __longToken: superadminToken,
            });

            expect(result.error).toBeUndefined();
            expect(result.school.name).toBe('Updated School Name');
        });

        it('should update multiple fields', async () => {
            const result = await schoolManager.updateSchool({
                schoolId: testSchool._id.toString(),
                address: 'New Address',
                phone: '999-888-7777',
                principal: 'New Principal',
                __longToken: superadminToken,
            });

            expect(result.error).toBeUndefined();
            expect(result.school.address).toBe('New Address');
            expect(result.school.phone).toBe('999-888-7777');
            expect(result.school.principal).toBe('New Principal');
        });

        it('should fail to update non-existent school', async () => {
            const result = await schoolManager.updateSchool({
                schoolId: '507f1f77bcf86cd799439011',
                name: 'New Name',
                __longToken: superadminToken,
            });

            expect(result.error).toBe('School not found');
        });

        it('should fail as school_admin', async () => {
            const schoolAdminToken = createSchoolAdminToken();

            const result = await schoolManager.updateSchool({
                schoolId: testSchool._id.toString(),
                name: 'New Name',
                __longToken: schoolAdminToken,
            });

            expect(result.error).toBe('Access denied. Only superadmins can manage schools.');
        });
    });

    describe('deleteSchool', () => {
        let testSchool;

        beforeEach(async () => {
            testSchool = await createTestSchool(deps.mongomodels.school);
        });

        it('should soft delete a school', async () => {
            const result = await schoolManager.deleteSchool({
                schoolId: testSchool._id.toString(),
                __longToken: superadminToken,
            });

            expect(result.error).toBeUndefined();
            expect(result.message).toContain('deleted successfully');

            // Verify soft delete
            const school = await deps.mongomodels.school.findById(testSchool._id);
            expect(school.isActive).toBe(false);
        });

        it('should fail to delete non-existent school', async () => {
            const result = await schoolManager.deleteSchool({
                schoolId: '507f1f77bcf86cd799439011',
                __longToken: superadminToken,
            });

            expect(result.error).toBe('School not found');
        });

        it('should fail to delete already deleted school', async () => {
            // First delete
            await schoolManager.deleteSchool({
                schoolId: testSchool._id.toString(),
                __longToken: superadminToken,
            });

            // Try to delete again
            const result = await schoolManager.deleteSchool({
                schoolId: testSchool._id.toString(),
                __longToken: superadminToken,
            });

            expect(result.error).toBe('School is already inactive');
        });

        it('should fail as school_admin', async () => {
            const schoolAdminToken = createSchoolAdminToken();

            const result = await schoolManager.deleteSchool({
                schoolId: testSchool._id.toString(),
                __longToken: schoolAdminToken,
            });

            expect(result.error).toBe('Access denied. Only superadmins can manage schools.');
        });
    });
});
