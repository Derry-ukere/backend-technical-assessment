module.exports = class User { 

    constructor({utils, cache, config, cortex, managers, validators, mongomodels }={}){
        this.config              = config;
        this.cortex              = cortex;
        this.validators          = validators; 
        this.mongomodels         = mongomodels;
        this.tokenManager        = managers.token;
        this.usersCollection     = "users";
        this.httpExposed         = ['createUser', 'login', 'get=getUserProfile', 'updateUser'];
    }

    /**
     * Register a new user
     * @param {Object} params - User registration data
     * @param {string} params.username - Username
     * @param {string} params.email - Email address
     * @param {string} params.password - Password
     * @param {string} params.role - User role (superadmin or school_admin)
     * @param {string} [params.schoolId] - School ID (required for school_admin)
     */
    async createUser({ username, email, password, role, schoolId }){
        const user = { username, email, password, role, schoolId };

        // Data validation
        let result = await this.validators.user.createUser(user);
        if(result) return { errors: result };

        // Check if user already exists
        const existingUser = await this.mongomodels.user.findOne({
            $or: [{ email }, { username }]
        });
        
        if(existingUser) {
            return { error: 'User with this email or username already exists' };
        }

        // Validate school_admin has schoolId
        if(role === 'school_admin' && !schoolId) {
            return { error: 'School ID is required for school admin' };
        }

        // Validate schoolId exists if provided
        if(schoolId) {
            const school = await this.mongomodels.school.findById(schoolId);
            if(!school) {
                return { error: 'Invalid school ID' };
            }
        }
        
        // Creation Logic - password will be hashed by mongoose pre-save hook
        let createdUser = await this.mongomodels.user.create({
            username,
            email,
            password,
            role,
            schoolId: role === 'school_admin' ? schoolId : undefined
        });

        let longToken = this.tokenManager.genLongToken({
            userId: createdUser._id,
            userKey: createdUser.username,
            role: createdUser.role,
            schoolId: createdUser.schoolId
        });
        
        // Response
        return {
            user: createdUser.toJSON(), 
            longToken 
        };
    }

    /**
     * Authenticate user and return tokens
     * @param {Object} params - Login credentials
     * @param {string} params.email - Email address
     * @param {string} params.password - Password
     */
    async login({ email, password }){
        // Validate input
        if(!email || !password) {
            return { error: 'Email and password are required' };
        }

        // Find user by email
        const user = await this.mongomodels.user.findOne({ email });
        
        if(!user) {
            return { error: 'Invalid email or password' };
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        
        if(!isPasswordValid) {
            return { error: 'Invalid email or password' };
        }

        // Generate long token with role and school info
        const longToken = this.tokenManager.genLongToken({
            userId: user._id,
            userKey: user.username,
            role: user.role,
            schoolId: user.schoolId
        });

        return {
            user: user.toJSON(),
            longToken
        };
    }

    /**
     * Get current user's profile
     * @param {Object} params - Request parameters
     * @param {Object} params.__token - Decoded token from middleware
     */
    async getUserProfile({ __token }){
        if(!__token || !__token.userId) {
            return { error: 'Authentication required' };
        }

        const user = await this.mongomodels.user.findById(__token.userId)
            .populate('schoolId', 'name address');
        
        if(!user) {
            return { error: 'User not found' };
        }

        return { user: user.toJSON() };
    }

    /**
     * Update user profile
     * @param {Object} params - Update data
     * @param {string} [params.username] - New username
     * @param {string} [params.email] - New email
     * @param {string} [params.password] - New password
     * @param {Object} params.__token - Decoded token from middleware
     */
    async updateUser({ username, email, password, __token }){
        if(!__token || !__token.userId) {
            return { error: 'Authentication required' };
        }

        const user = await this.mongomodels.user.findById(__token.userId);
        
        if(!user) {
            return { error: 'User not found' };
        }

        // Check for duplicate username/email
        if(username || email) {
            const existingUser = await this.mongomodels.user.findOne({
                _id: { $ne: __token.userId },
                $or: [
                    ...(username ? [{ username }] : []),
                    ...(email ? [{ email }] : [])
                ]
            });
            
            if(existingUser) {
                return { error: 'Username or email already in use' };
            }
        }

        // Update fields
        if(username) user.username = username;
        if(email) user.email = email;
        if(password) user.password = password; // Will be hashed by pre-save hook

        await user.save();

        return { user: user.toJSON() };
    }

}
