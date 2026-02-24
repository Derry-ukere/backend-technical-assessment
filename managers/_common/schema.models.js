const emojis = require('../../public/emojis.data.json');

module.exports = {
    id: {
        path: "id",
        type: "string",
        length: { min: 1, max: 50 },
    },
    username: {
        path: 'username',
        type: 'string',
        length: {min: 3, max: 20},
        custom: 'username',
    },
    password: {
        path: 'password',
        type: 'string',
        length: {min: 8, max: 100},
        custom: 'password',
    },
    email: {
        path: 'email',
        type: 'String',
        regex: /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        custom: 'email',
    },
    title: {
        path: 'title',
        type: 'string',
        length: {min: 3, max: 300}
    },
    label: {
        path: 'label',
        type: 'string',
        length: {min: 3, max: 100}
    },
    shortDesc: {
        path: 'desc',
        type: 'string',
        length: {min:3, max: 300}
    },
    longDesc: {
        path: 'desc',
        type: 'string',
        length: {min:3, max: 2000}
    },
    url: {
        path: 'url',
        type: 'string',
        length: {min: 9, max: 300},
        custom: 'url',
    },
    emoji: {
        path: 'emoji',
        type: 'Array',
        items: {
            type: 'string',
            length: {min: 1, max: 10},
            oneOf: emojis.value,
        }
    },
    price: {
        path: 'price',
        type: 'number',
    },
    avatar: {
        path: 'avatar',
        type: 'string',
        length: {min: 8, max: 100},
    },
    text: {
        type: 'String',
        length: {min: 3, max:15},
    },
    longText: {
        type: 'String',
        length: {min: 3, max:250},
    },
    paragraph: {
        type: 'String',
        length: {min: 3, max:10000},
    },
    phone: {
        path: 'phone',
        type: 'String',
        length: {min: 0, max: 20},
        custom: 'phone',
    },
    number: {
        type: 'Number',
        length: {min: 1, max:6},
    },
    arrayOfStrings: {
        type: 'Array',
        items: {
            type: 'String',
            length: { min: 3, max: 100}
        }
    },
    obj: {
        type: 'Object',
    },
    bool: {
        type: 'Boolean',
    },
    // School Management Models
    role: {
        path: 'role',
        type: 'String',
        oneOf: ['superadmin', 'school_admin'],
        custom: 'role',
    },
    schoolId: {
        path: 'schoolId',
        type: 'String',
        length: { min: 24, max: 24 },
        custom: 'objectId',
    },
    name: {
        path: 'name',
        type: 'String',
        length: { min: 1, max: 200 },
    },
    address: {
        path: 'address',
        type: 'String',
        length: { min: 0, max: 500 },
    },
    principal: {
        path: 'principal',
        type: 'String',
        length: { min: 0, max: 100 },
    },
    establishedYear: {
        path: 'establishedYear',
        type: 'Number',
        custom: 'year',
    },
    capacity: {
        path: 'capacity',
        type: 'Number',
        custom: 'capacity',
    },
    grade: {
        path: 'grade',
        type: 'String',
        length: { min: 0, max: 50 },
    },
    section: {
        path: 'section',
        type: 'String',
        length: { min: 0, max: 20 },
    },
    resources: {
        path: 'resources',
        type: 'Array',
        items: {
            type: 'String',
            length: { min: 1, max: 100 }
        }
    },
    academicYear: {
        path: 'academicYear',
        type: 'String',
        regex: /^\d{4}-\d{4}$/,
        custom: 'academicYear',
    },
    firstName: {
        path: 'firstName',
        type: 'String',
        length: { min: 1, max: 100 },
        custom: 'name',
    },
    lastName: {
        path: 'lastName',
        type: 'String',
        length: { min: 1, max: 100 },
        custom: 'name',
    },
    dateOfBirth: {
        path: 'dateOfBirth',
        type: 'String',
        custom: 'pastDate',
    },
    gender: {
        path: 'gender',
        type: 'String',
        oneOf: ['male', 'female', 'other'],
        custom: 'gender',
    },
    guardianName: {
        path: 'guardianName',
        type: 'String',
        length: { min: 0, max: 100 },
    },
    guardianPhone: {
        path: 'guardianPhone',
        type: 'String',
        length: { min: 0, max: 20 },
        custom: 'phone',
    },
    guardianEmail: {
        path: 'guardianEmail',
        type: 'String',
        regex: /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        custom: 'email',
    },
    classroomId: {
        path: 'classroomId',
        type: 'String',
        length: { min: 24, max: 24 },
        custom: 'objectId',
    },
    studentId: {
        path: 'studentId',
        type: 'String',
        length: { min: 24, max: 24 },
        custom: 'objectId',
    },
    toSchoolId: {
        path: 'toSchoolId',
        type: 'String',
        length: { min: 24, max: 24 },
        custom: 'objectId',
    },
    toClassroomId: {
        path: 'toClassroomId',
        type: 'String',
        length: { min: 24, max: 24 },
        custom: 'objectId',
    },
    reason: {
        path: 'reason',
        type: 'String',
        length: { min: 0, max: 500 },
    },
    isActive: {
        path: 'isActive',
        type: 'Boolean',
        custom: 'boolean',
    },
}