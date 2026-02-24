/**
 * Student Validation Schemas
 * Defines validation rules for student-related operations
 */
module.exports = {
    createStudent: [
        {
            model: 'firstName',
            required: true,
            path: 'firstName',
        },
        {
            model: 'lastName',
            required: true,
            path: 'lastName',
        },
        {
            model: 'email',
            required: false,
            path: 'email',
        },
        {
            model: 'dateOfBirth',
            required: false,
            path: 'dateOfBirth',
        },
        {
            model: 'gender',
            required: false,
            path: 'gender',
        },
        {
            model: 'schoolId',
            required: false,
            path: 'schoolId',
        },
        {
            model: 'classroomId',
            required: false,
            path: 'classroomId',
        },
        {
            model: 'guardianName',
            required: false,
            path: 'guardianName',
        },
        {
            model: 'guardianPhone',
            required: false,
            path: 'guardianPhone',
        },
        {
            model: 'guardianEmail',
            required: false,
            path: 'guardianEmail',
        },
        {
            model: 'address',
            required: false,
            path: 'address',
        },
    ],
    getStudents: [
        {
            model: 'schoolId',
            required: false,
            path: 'schoolId',
        },
        {
            model: 'classroomId',
            required: false,
            path: 'classroomId',
        },
        {
            model: 'isActive',
            required: false,
            path: 'isActive',
        },
    ],
    getStudent: [
        {
            model: 'studentId',
            required: true,
            path: 'studentId',
        },
    ],
    updateStudent: [
        {
            model: 'studentId',
            required: true,
            path: 'studentId',
        },
        {
            model: 'firstName',
            required: false,
            path: 'firstName',
        },
        {
            model: 'lastName',
            required: false,
            path: 'lastName',
        },
        {
            model: 'email',
            required: false,
            path: 'email',
        },
        {
            model: 'dateOfBirth',
            required: false,
            path: 'dateOfBirth',
        },
        {
            model: 'gender',
            required: false,
            path: 'gender',
        },
        {
            model: 'classroomId',
            required: false,
            path: 'classroomId',
        },
        {
            model: 'guardianName',
            required: false,
            path: 'guardianName',
        },
        {
            model: 'guardianPhone',
            required: false,
            path: 'guardianPhone',
        },
        {
            model: 'guardianEmail',
            required: false,
            path: 'guardianEmail',
        },
        {
            model: 'address',
            required: false,
            path: 'address',
        },
        {
            model: 'isActive',
            required: false,
            path: 'isActive',
        },
    ],
    deleteStudent: [
        {
            model: 'studentId',
            required: true,
            path: 'studentId',
        },
    ],
    transferStudent: [
        {
            model: 'studentId',
            required: true,
            path: 'studentId',
        },
        {
            model: 'toSchoolId',
            required: false,
            path: 'toSchoolId',
        },
        {
            model: 'toClassroomId',
            required: false,
            path: 'toClassroomId',
        },
        {
            model: 'reason',
            required: false,
            path: 'reason',
        },
    ],
}
