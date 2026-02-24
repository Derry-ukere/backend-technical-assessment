/**
 * Student Manager
 * 
 * Handles CRUD operations for students and transfers.
 * School admins can only manage students in their assigned school.
 * Superadmins can manage students in any school.
 */
module.exports = class Student { 

    constructor({utils, cache, config, cortex, managers, validators, mongomodels }={}){
        this.config              = config;
        this.cortex              = cortex;
        this.validators          = validators; 
        this.mongomodels         = mongomodels;
        this.usersCollection     = "students";
        this.httpExposed         = [
            'createStudent',
            'get=getStudents',
            'get=getStudent',
            'updateStudent',
            'deleteStudent',
            'transferStudent'
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
                return { error: 'Access denied. You can only access students in your assigned school.', code: 403 };
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
        if (!token) {
            return requestedSchoolId;
        }
        if (token.role === 'superadmin') {
            return requestedSchoolId;
        }
        // School admin uses their assigned school
        return token.schoolId;
    }

    /**
     * Create/enroll a new student
     * @param {Object} params - Student data
     * @param {string} [params.schoolId] - School ID (auto-assigned for school_admin)
     * @param {string} [params.classroomId] - Classroom ID
     * @param {string} params.firstName - First name (required)
     * @param {string} params.lastName - Last name (required)
     * @param {string} [params.email] - Email address
     * @param {string} [params.dateOfBirth] - Date of birth
     * @param {string} [params.gender] - Gender (male/female/other)
     * @param {string} [params.guardianName] - Guardian name
     * @param {string} [params.guardianPhone] - Guardian phone
     * @param {string} [params.guardianEmail] - Guardian email
     * @param {string} [params.address] - Student address
     * @param {Object} params.__longToken - Decoded token from middleware
     */
    async createStudent({ 
        schoolId, classroomId, firstName, lastName, email, 
        dateOfBirth, gender, guardianName, guardianPhone, 
        guardianEmail, address, __longToken 
    }){
        // Check authentication first
        if (!__longToken) {
            return { error: 'Authentication required', code: 401 };
        }

        // For school_admin, if they explicitly provide a different schoolId, check that first
        if (__longToken.role === 'school_admin' && schoolId) {
            const tokenSchoolId = __longToken.schoolId ? __longToken.schoolId.toString() : null;
            if (schoolId.toString() !== tokenSchoolId) {
                return { error: 'Access denied. You can only access students in your assigned school.', code: 403 };
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

        const studentData = { 
            firstName, lastName, email, dateOfBirth, 
            gender, guardianName, guardianPhone, guardianEmail, address 
        };

        // Validate input
        let result = await this.validators.student.createStudent(studentData);
        if(result) return { errors: result };

        // Verify school exists
        const school = await this.mongomodels.school.findById(effectiveSchoolId);
        if (!school) {
            return { error: 'School not found' };
        }
        if (!school.isActive) {
            return { error: 'Cannot enroll student in an inactive school' };
        }

        // If classroom is specified, verify it belongs to the school and has capacity
        if (classroomId) {
            const classroom = await this.mongomodels.classroom.findById(classroomId);
            if (!classroom) {
                return { error: 'Classroom not found' };
            }
            if (!classroom.isActive) {
                return { error: 'Cannot enroll student in an inactive classroom' };
            }
            if (classroom.schoolId.toString() !== effectiveSchoolId.toString()) {
                return { error: 'Classroom does not belong to the specified school' };
            }

            // Check classroom capacity
            const currentStudents = await this.mongomodels.student.countDocuments({
                classroomId,
                isActive: true
            });
            if (currentStudents >= classroom.capacity) {
                return { error: 'Classroom is at full capacity' };
            }
        }

        // Check for duplicate email if provided
        if (email) {
            const existingStudent = await this.mongomodels.student.findOne({ email });
            if (existingStudent) {
                return { error: 'A student with this email already exists' };
            }
        }

        // Create student
        const createdStudent = await this.mongomodels.student.create({
            schoolId: effectiveSchoolId,
            classroomId,
            firstName,
            lastName,
            email,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
            gender,
            guardianName,
            guardianPhone,
            guardianEmail,
            address,
            enrollmentDate: new Date(),
            createdBy: __longToken.userId
        });

        return {
            student: createdStudent.toJSON()
        };
    }

    /**
     * Get all students with pagination and filters
     * @param {Object} params - Query parameters
     * @param {string} [params.schoolId] - Filter by school ID
     * @param {string} [params.classroomId] - Filter by classroom ID
     * @param {number} [params.page=1] - Page number
     * @param {number} [params.limit=10] - Items per page
     * @param {string} [params.search] - Search term for name or email
     * @param {string} [params.gender] - Filter by gender
     * @param {boolean} [params.isActive] - Filter by active status
     * @param {Object} params.__longToken - Decoded token from middleware
     */
    async getStudents({ schoolId, classroomId, page = 1, limit = 10, search, gender, isActive, __longToken }){
        // Get effective school ID
        const effectiveSchoolId = this._getEffectiveSchoolId(__longToken, schoolId);

        // Check authorization
        const authError = this._checkSchoolAccess(__longToken, effectiveSchoolId);
        if (authError) return authError;

        // Build query
        const query = {};
        
        // School admins can only see their school's students
        if (__longToken.role === 'school_admin') {
            query.schoolId = __longToken.schoolId;
        } else if (effectiveSchoolId) {
            query.schoolId = effectiveSchoolId;
        }

        if (classroomId) {
            query.classroomId = classroomId;
        }

        if (typeof isActive !== 'undefined') {
            query.isActive = isActive === 'true' || isActive === true;
        }

        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (gender) {
            query.gender = gender;
        }

        // Parse pagination
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
        const skip = (pageNum - 1) * limitNum;

        // Execute query with pagination
        const [students, total] = await Promise.all([
            this.mongomodels.student
                .find(query)
                .populate('schoolId', 'name')
                .populate('classroomId', 'name grade section')
                .populate('createdBy', 'username email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            this.mongomodels.student.countDocuments(query)
        ]);

        return {
            students,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        };
    }

    /**
     * Get a single student by ID
     * @param {Object} params - Request parameters
     * @param {string} params.studentId - Student ID
     * @param {Object} params.__longToken - Decoded token from middleware
     */
    async getStudent({ studentId, __longToken }){
        if (!__longToken) {
            return { error: 'Authentication required', code: 401 };
        }

        if (!studentId) {
            return { error: 'Student ID is required' };
        }

        const student = await this.mongomodels.student
            .findById(studentId)
            .populate('schoolId', 'name address')
            .populate('classroomId', 'name grade section capacity')
            .populate('createdBy', 'username email')
            .populate('transferHistory.fromSchool', 'name')
            .populate('transferHistory.toSchool', 'name')
            .populate('transferHistory.fromClassroom', 'name')
            .populate('transferHistory.toClassroom', 'name');

        if (!student) {
            return { error: 'Student not found' };
        }

        // Check access
        const authError = this._checkSchoolAccess(__longToken, student.schoolId._id || student.schoolId);
        if (authError) return authError;

        return {
            student: student.toJSON()
        };
    }

    /**
     * Update student details
     * @param {Object} params - Update data
     * @param {string} params.studentId - Student ID (required)
     * @param {string} [params.firstName] - First name
     * @param {string} [params.lastName] - Last name
     * @param {string} [params.email] - Email address
     * @param {string} [params.dateOfBirth] - Date of birth
     * @param {string} [params.gender] - Gender
     * @param {string} [params.classroomId] - Classroom ID (for same-school classroom change)
     * @param {string} [params.guardianName] - Guardian name
     * @param {string} [params.guardianPhone] - Guardian phone
     * @param {string} [params.guardianEmail] - Guardian email
     * @param {string} [params.address] - Student address
     * @param {boolean} [params.isActive] - Active status
     * @param {Object} params.__longToken - Decoded token from middleware
     */
    async updateStudent({ 
        studentId, firstName, lastName, email, dateOfBirth, gender,
        classroomId, guardianName, guardianPhone, guardianEmail, 
        address, isActive, __longToken 
    }){
        if (!__longToken) {
            return { error: 'Authentication required', code: 401 };
        }

        if (!studentId) {
            return { error: 'Student ID is required' };
        }

        const student = await this.mongomodels.student.findById(studentId);
        
        if (!student) {
            return { error: 'Student not found' };
        }

        // Check access
        const authError = this._checkSchoolAccess(__longToken, student.schoolId);
        if (authError) return authError;

        // Check for duplicate email if updating email
        if (email && email !== student.email) {
            const existingStudent = await this.mongomodels.student.findOne({
                _id: { $ne: studentId },
                email
            });
            
            if (existingStudent) {
                return { error: 'A student with this email already exists' };
            }
        }

        // If changing classroom within same school
        if (classroomId && classroomId !== student.classroomId?.toString()) {
            const classroom = await this.mongomodels.classroom.findById(classroomId);
            if (!classroom) {
                return { error: 'Classroom not found' };
            }
            if (!classroom.isActive) {
                return { error: 'Cannot move student to an inactive classroom' };
            }
            if (classroom.schoolId.toString() !== student.schoolId.toString()) {
                return { error: 'Use transferStudent to move student to a different school\'s classroom' };
            }

            // Check classroom capacity
            const currentStudents = await this.mongomodels.student.countDocuments({
                classroomId,
                isActive: true
            });
            if (currentStudents >= classroom.capacity) {
                return { error: 'Target classroom is at full capacity' };
            }
        }

        // Update fields
        if (firstName !== undefined) student.firstName = firstName;
        if (lastName !== undefined) student.lastName = lastName;
        if (email !== undefined) student.email = email;
        if (dateOfBirth !== undefined) student.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
        if (gender !== undefined) student.gender = gender;
        if (classroomId !== undefined) student.classroomId = classroomId || null;
        if (guardianName !== undefined) student.guardianName = guardianName;
        if (guardianPhone !== undefined) student.guardianPhone = guardianPhone;
        if (guardianEmail !== undefined) student.guardianEmail = guardianEmail;
        if (address !== undefined) student.address = address;
        if (isActive !== undefined) student.isActive = isActive;

        await student.save();

        return { student: student.toJSON() };
    }

    /**
     * Soft delete (unenroll) a student
     * @param {Object} params - Request parameters
     * @param {string} params.studentId - Student ID
     * @param {Object} params.__longToken - Decoded token from middleware
     */
    async deleteStudent({ studentId, __longToken }){
        if (!__longToken) {
            return { error: 'Authentication required', code: 401 };
        }

        if (!studentId) {
            return { error: 'Student ID is required' };
        }

        const student = await this.mongomodels.student.findById(studentId);
        
        if (!student) {
            return { error: 'Student not found' };
        }

        // Check access
        const authError = this._checkSchoolAccess(__longToken, student.schoolId);
        if (authError) return authError;

        if (!student.isActive) {
            return { error: 'Student is already unenrolled' };
        }

        // Soft delete
        student.isActive = false;
        student.classroomId = null; // Remove from classroom
        await student.save();

        return { 
            message: 'Student unenrolled successfully',
            student: student.toJSON()
        };
    }

    /**
     * Transfer student between schools and/or classrooms
     * @param {Object} params - Transfer data
     * @param {string} params.studentId - Student ID (required)
     * @param {string} [params.toSchoolId] - Target school ID
     * @param {string} [params.toClassroomId] - Target classroom ID
     * @param {string} [params.reason] - Reason for transfer
     * @param {Object} params.__longToken - Decoded token from middleware
     */
    async transferStudent({ studentId, toSchoolId, toClassroomId, reason, __longToken }){
        if (!__longToken) {
            return { error: 'Authentication required', code: 401 };
        }

        if (!studentId) {
            return { error: 'Student ID is required' };
        }

        if (!toSchoolId && !toClassroomId) {
            return { error: 'At least one of toSchoolId or toClassroomId is required' };
        }

        const student = await this.mongomodels.student.findById(studentId)
            .populate('schoolId', 'name')
            .populate('classroomId', 'name');
        
        if (!student) {
            return { error: 'Student not found' };
        }

        if (!student.isActive) {
            return { error: 'Cannot transfer an inactive student' };
        }

        // Store original values for transfer history
        const fromSchoolId = student.schoolId._id || student.schoolId;
        const fromClassroomId = student.classroomId?._id || student.classroomId;
        
        // Determine effective target school
        const targetSchoolId = toSchoolId || fromSchoolId.toString();
        
        // Check source school access
        const sourceAuthError = this._checkSchoolAccess(__longToken, fromSchoolId);
        if (sourceAuthError) return sourceAuthError;

        // Check if this is a cross-school transfer
        const isCrossSchoolTransfer = toSchoolId && toSchoolId !== fromSchoolId.toString();
        
        // Cross-school transfers require superadmin
        if (isCrossSchoolTransfer && __longToken.role !== 'superadmin') {
            return { error: 'Only superadmins can transfer students between schools', code: 403 };
        }

        // Verify target school exists and is active
        if (toSchoolId) {
            const targetSchool = await this.mongomodels.school.findById(toSchoolId);
            if (!targetSchool) {
                return { error: 'Target school not found' };
            }
            if (!targetSchool.isActive) {
                return { error: 'Cannot transfer student to an inactive school' };
            }
        }

        // Verify target classroom if specified
        let targetClassroom = null;
        if (toClassroomId) {
            targetClassroom = await this.mongomodels.classroom.findById(toClassroomId);
            if (!targetClassroom) {
                return { error: 'Target classroom not found' };
            }
            if (!targetClassroom.isActive) {
                return { error: 'Cannot transfer student to an inactive classroom' };
            }
            
            // Verify classroom belongs to target school
            if (targetClassroom.schoolId.toString() !== targetSchoolId.toString()) {
                return { error: 'Target classroom does not belong to the target school' };
            }

            // Check classroom capacity
            const currentStudents = await this.mongomodels.student.countDocuments({
                classroomId: toClassroomId,
                isActive: true
            });
            if (currentStudents >= targetClassroom.capacity) {
                return { error: 'Target classroom is at full capacity' };
            }
        }

        // Create transfer history entry
        const transferEntry = {
            fromSchool: fromSchoolId,
            toSchool: toSchoolId || fromSchoolId,
            fromClassroom: fromClassroomId || null,
            toClassroom: toClassroomId || null,
            date: new Date(),
            reason: reason || ''
        };

        // Update student
        if (toSchoolId) {
            student.schoolId = toSchoolId;
        }
        student.classroomId = toClassroomId || null;
        student.transferHistory.push(transferEntry);

        await student.save();

        // Reload with populated fields
        const updatedStudent = await this.mongomodels.student
            .findById(studentId)
            .populate('schoolId', 'name address')
            .populate('classroomId', 'name grade section')
            .populate('transferHistory.fromSchool', 'name')
            .populate('transferHistory.toSchool', 'name')
            .populate('transferHistory.fromClassroom', 'name')
            .populate('transferHistory.toClassroom', 'name');

        return {
            message: 'Student transferred successfully',
            student: updatedStudent.toJSON(),
            transfer: {
                from: {
                    school: student.schoolId?.name || fromSchoolId,
                    classroom: student.classroomId?.name || fromClassroomId
                },
                to: {
                    school: toSchoolId ? (await this.mongomodels.school.findById(toSchoolId).select('name'))?.name : student.schoolId?.name,
                    classroom: targetClassroom?.name || null
                }
            }
        };
    }
}
