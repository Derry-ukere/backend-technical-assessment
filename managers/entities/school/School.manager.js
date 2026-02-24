/**
 * School Manager
 * 
 * Handles CRUD operations for schools.
 * Only superadmins can manage schools.
 */
module.exports = class School { 

    constructor({utils, cache, config, cortex, managers, validators, mongomodels }={}){
        this.config              = config;
        this.cortex              = cortex;
        this.validators          = validators; 
        this.mongomodels         = mongomodels;
        this.usersCollection     = "schools";
        this.httpExposed         = [
            'createSchool',
            'get=getSchools',
            'get=getSchool',
            'updateSchool',
            'deleteSchool'
        ];
    }

    /**
     * Check if user has superadmin role
     * @param {Object} token - Decoded token
     * @returns {Object|null} Error object if not authorized, null if authorized
     */
    _checkSuperadminAccess(token) {
        if (!token) {
            return { error: 'Authentication required', code: 401 };
        }
        if (token.role !== 'superadmin') {
            return { error: 'Access denied. Only superadmins can manage schools.', code: 403 };
        }
        return null;
    }

    /**
     * Create a new school
     * @param {Object} params - School data
     * @param {string} params.name - School name (required)
     * @param {string} [params.address] - School address
     * @param {string} [params.phone] - Phone number
     * @param {string} [params.email] - Email address
     * @param {string} [params.principal] - Principal name
     * @param {number} [params.establishedYear] - Year established
     * @param {Object} params.__longToken - Decoded token from middleware
     */
    async createSchool({ name, address, phone, email, principal, establishedYear, __longToken }){
        // Check authorization
        const authError = this._checkSuperadminAccess(__longToken);
        if (authError) return authError;

        const schoolData = { name, address, phone, email, principal, establishedYear };

        // Validate input
        let result = await this.validators.school.createSchool(schoolData);
        if(result) return { errors: result };

        // Check if school with same name already exists
        const existingSchool = await this.mongomodels.school.findOne({ 
            name: { $regex: new RegExp(`^${name}$`, 'i') },
            isActive: true 
        });
        
        if(existingSchool) {
            return { error: 'A school with this name already exists' };
        }

        // Create school
        const createdSchool = await this.mongomodels.school.create({
            name,
            address,
            phone,
            email,
            principal,
            establishedYear,
            createdBy: __longToken.userId
        });

        return {
            school: createdSchool.toJSON()
        };
    }

    /**
     * Get all schools with pagination
     * @param {Object} params - Query parameters
     * @param {number} [params.page=1] - Page number
     * @param {number} [params.limit=10] - Items per page
     * @param {string} [params.search] - Search term for name
     * @param {boolean} [params.isActive] - Filter by active status
     * @param {Object} params.__longToken - Decoded token from middleware
     */
    async getSchools({ page = 1, limit = 10, search, isActive, __longToken }){
        // Check authorization
        const authError = this._checkSuperadminAccess(__longToken);
        if (authError) return authError;

        // Build query
        const query = {};
        
        if (typeof isActive !== 'undefined') {
            query.isActive = isActive === 'true' || isActive === true;
        }

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        // Parse pagination
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
        const skip = (pageNum - 1) * limitNum;

        // Execute query with pagination
        const [schools, total] = await Promise.all([
            this.mongomodels.school
                .find(query)
                .populate('createdBy', 'username email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            this.mongomodels.school.countDocuments(query)
        ]);

        return {
            schools,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        };
    }

    /**
     * Get a single school by ID
     * @param {Object} params - Request parameters
     * @param {string} params.schoolId - School ID
     * @param {Object} params.__longToken - Decoded token from middleware
     */
    async getSchool({ schoolId, __longToken }){
        // Check authorization
        const authError = this._checkSuperadminAccess(__longToken);
        if (authError) return authError;

        if (!schoolId) {
            return { error: 'School ID is required' };
        }

        const school = await this.mongomodels.school
            .findById(schoolId)
            .populate('createdBy', 'username email');

        if (!school) {
            return { error: 'School not found' };
        }

        // Get classroom and student counts
        const [classroomCount, studentCount] = await Promise.all([
            this.mongomodels.classroom.countDocuments({ schoolId, isActive: true }),
            this.mongomodels.student.countDocuments({ schoolId, isActive: true })
        ]);

        return {
            school: {
                ...school.toJSON(),
                classroomCount,
                studentCount
            }
        };
    }

    /**
     * Update school details
     * @param {Object} params - Update data
     * @param {string} params.schoolId - School ID (required)
     * @param {string} [params.name] - School name
     * @param {string} [params.address] - School address
     * @param {string} [params.phone] - Phone number
     * @param {string} [params.email] - Email address
     * @param {string} [params.principal] - Principal name
     * @param {number} [params.establishedYear] - Year established
     * @param {boolean} [params.isActive] - Active status
     * @param {Object} params.__longToken - Decoded token from middleware
     */
    async updateSchool({ schoolId, name, address, phone, email, principal, establishedYear, isActive, __longToken }){
        // Check authorization
        const authError = this._checkSuperadminAccess(__longToken);
        if (authError) return authError;

        if (!schoolId) {
            return { error: 'School ID is required' };
        }

        const school = await this.mongomodels.school.findById(schoolId);
        
        if (!school) {
            return { error: 'School not found' };
        }

        // Check for duplicate name if updating name
        if (name && name !== school.name) {
            const existingSchool = await this.mongomodels.school.findOne({
                _id: { $ne: schoolId },
                name: { $regex: new RegExp(`^${name}$`, 'i') },
                isActive: true
            });
            
            if (existingSchool) {
                return { error: 'A school with this name already exists' };
            }
        }

        // Update fields
        if (name !== undefined) school.name = name;
        if (address !== undefined) school.address = address;
        if (phone !== undefined) school.phone = phone;
        if (email !== undefined) school.email = email;
        if (principal !== undefined) school.principal = principal;
        if (establishedYear !== undefined) school.establishedYear = establishedYear;
        if (isActive !== undefined) school.isActive = isActive;

        await school.save();

        return { school: school.toJSON() };
    }

    /**
     * Soft delete a school
     * @param {Object} params - Request parameters
     * @param {string} params.schoolId - School ID
     * @param {Object} params.__longToken - Decoded token from middleware
     */
    async deleteSchool({ schoolId, __longToken }){
        // Check authorization
        const authError = this._checkSuperadminAccess(__longToken);
        if (authError) return authError;

        if (!schoolId) {
            return { error: 'School ID is required' };
        }

        const school = await this.mongomodels.school.findById(schoolId);
        
        if (!school) {
            return { error: 'School not found' };
        }

        if (!school.isActive) {
            return { error: 'School is already inactive' };
        }

        // Check if school has active classrooms or students
        const [activeClassrooms, activeStudents] = await Promise.all([
            this.mongomodels.classroom.countDocuments({ schoolId, isActive: true }),
            this.mongomodels.student.countDocuments({ schoolId, isActive: true })
        ]);

        if (activeClassrooms > 0 || activeStudents > 0) {
            return { 
                error: 'Cannot delete school with active classrooms or students. Please deactivate or transfer them first.',
                activeClassrooms,
                activeStudents
            };
        }

        // Soft delete
        school.isActive = false;
        await school.save();

        return { 
            message: 'School deleted successfully',
            school: school.toJSON()
        };
    }
}
