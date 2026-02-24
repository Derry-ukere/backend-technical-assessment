/**
 * User Validation Schemas
 * Defines validation rules for user-related operations
 */
module.exports = {
    createUser: [
        {
            model: 'username',
            required: true,
            path: 'username',
        },
        {
            model: 'email',
            required: true,
            path: 'email',
        },
        {
            model: 'password',
            required: true,
            path: 'password',
        },
        {
            model: 'role',
            required: true,
            path: 'role',
        },
        {
            model: 'schoolId',
            required: false,
            path: 'schoolId',
        },
    ],
    login: [
        {
            model: 'email',
            required: true,
            path: 'email',
        },
        {
            model: 'password',
            required: true,
            path: 'password',
        },
    ],
    updateUser: [
        {
            model: 'username',
            required: false,
            path: 'username',
        },
        {
            model: 'email',
            required: false,
            path: 'email',
        },
        {
            model: 'password',
            required: false,
            path: 'password',
        },
    ],
    getUserProfile: [],
    getUsers: [
        {
            model: 'role',
            required: false,
            path: 'role',
        },
        {
            model: 'isActive',
            required: false,
            path: 'isActive',
        },
    ],
    deleteUser: [
        {
            model: 'id',
            required: true,
            path: 'userId',
        },
    ],
}


