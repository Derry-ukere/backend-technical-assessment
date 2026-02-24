/**
 * Classroom Validation Schemas
 * Defines validation rules for classroom-related operations
 */
module.exports = {
    createClassroom: [
        {
            model: 'name',
            required: true,
            path: 'name',
        },
        {
            model: 'schoolId',
            required: false,
            path: 'schoolId',
        },
        {
            model: 'capacity',
            required: true,
            path: 'capacity',
        },
        {
            model: 'grade',
            required: false,
            path: 'grade',
        },
        {
            model: 'section',
            required: false,
            path: 'section',
        },
        {
            model: 'resources',
            required: false,
            path: 'resources',
        },
        {
            model: 'academicYear',
            required: false,
            path: 'academicYear',
        },
    ],
    getClassrooms: [
        {
            model: 'schoolId',
            required: false,
            path: 'schoolId',
        },
        {
            model: 'grade',
            required: false,
            path: 'grade',
        },
        {
            model: 'isActive',
            required: false,
            path: 'isActive',
        },
    ],
    getClassroom: [
        {
            model: 'classroomId',
            required: true,
            path: 'classroomId',
        },
    ],
    updateClassroom: [
        {
            model: 'classroomId',
            required: true,
            path: 'classroomId',
        },
        {
            model: 'name',
            required: false,
            path: 'name',
        },
        {
            model: 'capacity',
            required: false,
            path: 'capacity',
        },
        {
            model: 'grade',
            required: false,
            path: 'grade',
        },
        {
            model: 'section',
            required: false,
            path: 'section',
        },
        {
            model: 'resources',
            required: false,
            path: 'resources',
        },
        {
            model: 'academicYear',
            required: false,
            path: 'academicYear',
        },
        {
            model: 'isActive',
            required: false,
            path: 'isActive',
        },
    ],
    deleteClassroom: [
        {
            model: 'classroomId',
            required: true,
            path: 'classroomId',
        },
    ],
}
