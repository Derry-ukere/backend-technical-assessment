/**
 * Role-Based Access Control Middleware
 * 
 * This middleware checks if the authenticated user has the required role(s)
 * to access a specific resource or endpoint.
 * 
 * Usage in API manager:
 * - Add '__role' to the method's middleware array
 * - Pass required roles via meta.roles (e.g., meta.roles = ['superadmin'])
 * 
 * Roles:
 * - superadmin: Full access to all resources across all schools
 * - school_admin: Limited access to their assigned school's resources only
 */
module.exports = ({ meta, config, managers }) => {
    return ({ req, res, next }) => {
        // Get the decoded token from previous middleware
        const decoded = req.decoded || req.body.__token;
        
        if (!decoded) {
            return managers.responseDispatcher.dispatch(res, {
                ok: false,
                code: 401,
                errors: 'Authentication required'
            });
        }

        // Get required roles from meta (set by the API endpoint)
        const requiredRoles = meta.roles || [];
        
        // If no roles specified, allow access (but user must still be authenticated)
        if (requiredRoles.length === 0) {
            return next(decoded);
        }

        const userRole = decoded.role;

        // Check if user's role is in the required roles
        if (!requiredRoles.includes(userRole)) {
            return managers.responseDispatcher.dispatch(res, {
                ok: false,
                code: 403,
                errors: `Access denied. Required role(s): ${requiredRoles.join(', ')}`
            });
        }

        // User has required role, proceed
        next(decoded);
    };
};
