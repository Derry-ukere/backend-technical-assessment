/**
 * School Validation Schemas
 * Defines validation rules for school-related operations
 */
module.exports = {
    createSchool: [
        {
            model: 'name',
            required: true,
            path: 'name',
        },
        {
            model: 'address',
            required: false,
            path: 'address',
        },
        {
            model: 'phone',
            required: false,
            path: 'phone',
        },
        {
            model: 'email',
            required: false,
            path: 'email',
        },
        {
            model: 'principal',
            required: false,
            path: 'principal',
        },
        {
            model: 'establishedYear',
            required: false,
            path: 'establishedYear',
        },
    ],
    getSchools: [
        {
            model: 'isActive',
            required: false,
            path: 'isActive',
        },
    ],
    getSchool: [
        {
            model: 'schoolId',
            required: true,
            path: 'schoolId',
        },
    ],
    updateSchool: [
        {
            model: 'schoolId',
            required: true,
            path: 'schoolId',
        },
        {
            model: 'name',
            required: false,
            path: 'name',
        },
        {
            model: 'address',
            required: false,
            path: 'address',
        },
        {
            model: 'phone',
            required: false,
            path: 'phone',
        },
        {
            model: 'email',
            required: false,
            path: 'email',
        },
        {
            model: 'principal',
            required: false,
            path: 'principal',
        },
        {
            model: 'establishedYear',
            required: false,
            path: 'establishedYear',
        },
        {
            model: 'isActive',
            required: false,
            path: 'isActive',
        },
    ],
    deleteSchool: [
        {
            model: 'schoolId',
            required: true,
            path: 'schoolId',
        },
    ],
}
