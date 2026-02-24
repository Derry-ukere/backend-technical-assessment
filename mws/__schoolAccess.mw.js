/**
 * School Access Middleware
 * 
 * This middleware ensures that school admins can only access resources
 * belonging to their assigned school. Superadmins have access to all schools.
 * 
 * Usage in API manager:
 * - Add '__schoolAccess' to the method's middleware array
 * - The middleware checks schoolId from request params, body, or query
 * 
 * Access Rules:
 * - Superadmin: Can access any school's resources
 * - School Admin: Can only access their assigned school's resources
 */
module.exports = ({ meta, config, managers }) => {
    return async ({ req, res, next }) => {
        // Get the decoded token from previous middleware
        const decoded = req.decoded || req.body.__token;
        
        if (!decoded) {
            return managers.responseDispatcher.dispatch(res, {
                ok: false,
                code: 401,
                errors: 'Authentication required'
            });
        }

        const userRole = decoded.role;
        const userSchoolId = decoded.schoolId;

        // Superadmin has access to all schools
        if (userRole === 'superadmin') {
            return next(decoded);
        }

        // For school_admin, verify school access
        if (userRole === 'school_admin') {
            // Get the school ID from request (params, body, or query)
            const requestedSchoolId = 
                req.params?.schoolId || 
                req.body?.schoolId || 
                req.query?.schoolId;

            // If no school ID in request, inject the user's school ID
            if (!requestedSchoolId) {
                // Auto-assign the user's school to the request
                req.body = req.body || {};
                req.body.schoolId = userSchoolId;
                return next(decoded);
            }

            // Convert to string for comparison
            const requestedSchoolStr = requestedSchoolId.toString();
            const userSchoolStr = userSchoolId ? userSchoolId.toString() : null;

            // Check if the requested school matches user's assigned school
            if (requestedSchoolStr !== userSchoolStr) {
                return managers.responseDispatcher.dispatch(res, {
                    ok: false,
                    code: 403,
                    errors: 'Access denied. You can only access resources from your assigned school.'
                });
            }
        }

        next(decoded);
    };
};
