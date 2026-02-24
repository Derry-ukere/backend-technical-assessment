/**
 * Classroom Manager
 * 
 * Handles CRUD operations for classrooms.
 * School admins can only manage classrooms in their assigned school.
 * Superadmins can manage classrooms in any school.
 */
module.exports = class Classroom { 

    constructor({utils, cache, config, cortex, managers, validators, mongomodels }={}){
        this.config              = config;
        this.cortex              = cortex;
        this.validators          = validators; 
        this.mongomodels         = mongomodels;
        this.usersCollection     = "classrooms";
        this.httpExposed         = [
            'createClassroom',
            'get=getClassrooms',
            'get=getClassroom',
            'updateClassroom',
            'deleteClassroom'
        ];
    }

    /**
     * Check if user has access to the school
     * @param {Object} token - Decoded token
     * @param {string} schoolId - School ID to access
     * @returns {Object|null} Error object if not authorized, null if authorized
     */
    _checkSchoolAccess(token, schoolId) {
        if (!token) {
            return { error: 'Authentication required', code: 401 };
        }
        
        // Superadmin has access to all schools
        if (token.role === 'superadmin') {
            return null;
        }
        
        // School admin can only access their assigned school
        if (token.role === 'school_admin') {
            if (!schoolId) {
                return null; // School ID will be auto-assigned from token
            }
            
            const tokenSchoolId = token.schoolId ? token.schoolId.toString() : null;
            const requestedSchoolId = schoolId.toString();
            
            if (tokenSchoolId !== requestedSchoolId) {
                return { error: 'Access denied. You can only access your assigned school.', code: 403 };
            }
            return null;
        }
        
        return { error: 'Access denied.', code: 403 };
    }

    /**
     * Get the effective school ID for the request
     * @param {Object} token - Decoded token
     * @param {string} requestedSchoolId - School ID from request
     * @returns {string} Effective school ID
     */
    _getEffectiveSchoolId(token, requestedSchoolId) {
        if (token.role === 'superadmin') {
            return requestedSchoolId;
        }
        // School admin uses their assigned school
        return token.schoolId;
    }

    /**
     * Create a new classroom
     * @param {Object} params - Classroom data
     * @param {string} [params.schoolId] - School ID (auto-assigned for school_admin)
     * @param {string} params.name - Classroom name (required)
     * @param {number} params.capacity - Classroom capacity (required)
     * @param {string} [params.grade] - Grade level
     * @param {string} [params.section] - Section identifier
     * @param {string[]} [params.resources] - Available resources
     * @param {string} [params.academicYear] - Academic year (e.g., "2024-2025")
     * @param {Object} params.__longToken - Decoded token from middleware
     */
    async createClassroom({ schoolId, name, capacity, grade, section, resources, academicYear, __longToken }){
        // Check authentication first
        if (!__longToken) {
            return { error: 'Authentication required', code: 401 };
        }

        // For school_admin, if they explicitly provide a different schoolId, check that first
        if (__longToken.role === 'school_admin' && schoolId) {
            const tokenSchoolId = __longToken.schoolId ? __longToken.schoolId.toString() : null;
            if (schoolId.toString() !== tokenSchoolId) {
                return { error: 'Access denied. You can only access your assigned school.', code: 403 };
            }
        }

        // Get effective school ID
        const effectiveSchoolId = this._getEffectiveSchoolId(__longToken, schoolId);
        
        // Check authorization
        const authError = this._checkSchoolAccess(__longToken, effectiveSchoolId);
        if (authError) return authError;

        // Superadmin must specify schoolId
        if (__longToken.role === 'superadmin' && !effectiveSchoolId) {
            return { error: 'School ID is required for superadmin' };
        }

        const classroomData = { name, capacity, grade, section, resources, academicYear };

        // Validate input
        let result = await this.validators.classroom.createClassroom(classroomData);
        if(result) return { errors: result };

        // Verify school exists
        const school = await this.mongomodels.school.findById(effectiveSchoolId);
        if (!school) {
            return { error: 'School not found' };
        }
        if (!school.isActive) {
            return { error: 'Cannot create classroom in an inactive school' };
        }

        // Check for duplicate classroom name in the same school and academic year
        const duplicateQuery = { 
            schoolId: effectiveSchoolId,
            name: { $regex: new RegExp(`^${name}$`, 'i') },
            isActive: true
        };
        if (academicYear) {
            duplicateQuery.academicYear = academicYear;
        }

        const existingClassroom = await this.mongomodels.classroom.findOne(duplicateQuery);
        
        if(existingClassroom) {
            return { error: 'A classroom with this name already exists in this school' + (academicYear ? ' for the same academic year' : '') };
        }

        // Create classroom
        try {
            const createdClassroom = await this.mongomodels.classroom.create({
                schoolId: effectiveSchoolId,
                name,
                capacity,
                grade,
                section,
                resources: resources || [],
                academicYear,
                createdBy: __longToken.userId
            });

            return {
                classroom: createdClassroom.toJSON()
            };
        } catch (error) {
            if (error.name === 'ValidationError') {
                const errors = Object.values(error.errors).map(e => e.message);
                return { errors };
            }
            throw error;
        }
    }

    /**
     * Get all classrooms with pagination
     * @param {Object} params - Query parameters
     * @param {string} [params.schoolId] - Filter by school ID
     * @param {number} [params.page=1] - Page number
     * @param {number} [params.limit=10] - Items per page
     * @param {string} [params.search] - Search term for name
     * @param {string} [params.grade] - Filter by grade
     * @param {boolean} [params.isActive] - Filter by active status
     * @param {string} [params.academicYear] - Filter by academic year
     * @param {Object} params.__longToken - Decoded token from middleware
     */
    async getClassrooms({ schoolId, page = 1, limit = 10, search, grade, isActive, academicYear, __longToken }){
        // Get effective school ID
        const effectiveSchoolId = this._getEffectiveSchoolId(__longToken, schoolId);

        // Check authorization
        const authError = this._checkSchoolAccess(__longToken, effectiveSchoolId);
        if (authError) return authError;

        // Build query
        const query = {};
        
        // School admins can only see their school's classrooms
        if (__longToken.role === 'school_admin') {
            query.schoolId = __longToken.schoolId;
        } else if (effectiveSchoolId) {
            query.schoolId = effectiveSchoolId;
        }

        if (typeof isActive !== 'undefined') {
            query.isActive = isActive === 'true' || isActive === true;
        }

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        if (grade) {
            query.grade = grade;
        }

        if (academicYear) {
            query.academicYear = academicYear;
        }

        // Parse pagination
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
        const skip = (pageNum - 1) * limitNum;

        // Execute query with pagination
        const [classrooms, total] = await Promise.all([
            this.mongomodels.classroom
                .find(query)
                .populate('schoolId', 'name')
                .populate('createdBy', 'username email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            this.mongomodels.classroom.countDocuments(query)
        ]);

        // Add student count to each classroom
        const classroomsWithCount = await Promise.all(
            classrooms.map(async (classroom) => {
                const studentCount = await this.mongomodels.student.countDocuments({
                    classroomId: classroom._id,
                    isActive: true
                });
                return {
                    ...classroom,
                    studentCount,
                    availableSeats: classroom.capacity - studentCount
                };
            })
        );

        return {
            classrooms: classroomsWithCount,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        };
    }

    /**
     * Get a single classroom by ID
     * @param {Object} params - Request parameters
     * @param {string} params.classroomId - Classroom ID
     * @param {Object} params.__longToken - Decoded token from middleware
     */
    async getClassroom({ classroomId, __longToken }){
        if (!__longToken) {
            return { error: 'Authentication required', code: 401 };
        }

        if (!classroomId) {
            return { error: 'Classroom ID is required' };
        }

        const classroom = await this.mongomodels.classroom
            .findById(classroomId)
            .populate('schoolId', 'name address')
            .populate('createdBy', 'username email');

        if (!classroom) {
            return { error: 'Classroom not found' };
        }

        // Check access
        const authError = this._checkSchoolAccess(__longToken, classroom.schoolId._id || classroom.schoolId);
        if (authError) return authError;

        // Get student count
        const studentCount = await this.mongomodels.student.countDocuments({
            classroomId,
            isActive: true
        });

        return {
            classroom: {
                ...classroom.toJSON(),
                studentCount,
                availableSeats: classroom.capacity - studentCount
            }
        };
    }

    /**
     * Update classroom details
     * @param {Object} params - Update data
     * @param {string} params.classroomId - Classroom ID (required)
     * @param {string} [params.name] - Classroom name
     * @param {number} [params.capacity] - Classroom capacity
     * @param {string} [params.grade] - Grade level
     * @param {string} [params.section] - Section identifier
     * @param {string[]} [params.resources] - Available resources
     * @param {string} [params.academicYear] - Academic year
     * @param {boolean} [params.isActive] - Active status
     * @param {Object} params.__longToken - Decoded token from middleware
     */
    async updateClassroom({ classroomId, name, capacity, grade, section, resources, academicYear, isActive, __longToken }){
        if (!__longToken) {
            return { error: 'Authentication required', code: 401 };
        }

        if (!classroomId) {
            return { error: 'Classroom ID is required' };
        }

        const classroom = await this.mongomodels.classroom.findById(classroomId);
        
        if (!classroom) {
            return { error: 'Classroom not found' };
        }

        // Check access
        const authError = this._checkSchoolAccess(__longToken, classroom.schoolId);
        if (authError) return authError;

        // If reducing capacity, check if current students exceed new capacity
        if (capacity !== undefined && capacity < classroom.capacity) {
            const currentStudents = await this.mongomodels.student.countDocuments({
                classroomId,
                isActive: true
            });
            
            if (currentStudents > capacity) {
                return { 
                    error: `Cannot reduce capacity below current student count (${currentStudents})` 
                };
            }
        }

        // Check for duplicate name if updating name
        if (name && name !== classroom.name) {
            const duplicateQuery = {
                _id: { $ne: classroomId },
                schoolId: classroom.schoolId,
                name: { $regex: new RegExp(`^${name}$`, 'i') },
                isActive: true
            };
            if (academicYear || classroom.academicYear) {
                duplicateQuery.academicYear = academicYear || classroom.academicYear;
            }

            const existingClassroom = await this.mongomodels.classroom.findOne(duplicateQuery);
            
            if (existingClassroom) {
                return { error: 'A classroom with this name already exists in this school' };
            }
        }

        // Update fields
        if (name !== undefined) classroom.name = name;
        if (capacity !== undefined) classroom.capacity = capacity;
        if (grade !== undefined) classroom.grade = grade;
        if (section !== undefined) classroom.section = section;
        if (resources !== undefined) classroom.resources = resources;
        if (academicYear !== undefined) classroom.academicYear = academicYear;
        if (isActive !== undefined) classroom.isActive = isActive;

        await classroom.save();

        return { classroom: classroom.toJSON() };
    }

    /**
     * Soft delete a classroom
     * @param {Object} params - Request parameters
     * @param {string} params.classroomId - Classroom ID
     * @param {Object} params.__longToken - Decoded token from middleware
     */
    async deleteClassroom({ classroomId, __longToken }){
        if (!__longToken) {
            return { error: 'Authentication required', code: 401 };
        }

        if (!classroomId) {
            return { error: 'Classroom ID is required' };
        }

        const classroom = await this.mongomodels.classroom.findById(classroomId);
        
        if (!classroom) {
            return { error: 'Classroom not found' };
        }

        // Check access
        const authError = this._checkSchoolAccess(__longToken, classroom.schoolId);
        if (authError) return authError;

        if (!classroom.isActive) {
            return { error: 'Classroom is already inactive' };
        }

        // Check if classroom has active students
        const activeStudents = await this.mongomodels.student.countDocuments({
            classroomId,
            isActive: true
        });

        if (activeStudents > 0) {
            return { 
                error: 'Cannot delete classroom with active students. Please transfer or remove students first.',
                activeStudents
            };
        }

        // Soft delete
        classroom.isActive = false;
        await classroom.save();

        return { 
            message: 'Classroom deleted successfully',
            classroom: classroom.toJSON()
        };
    }
}
