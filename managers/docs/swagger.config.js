const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'School Management System API',
            version: '1.0.0',
            description: `
## Overview
A comprehensive School Management System API that provides functionality for managing schools, classrooms, and students with role-based access control (RBAC).

## Authentication
This API uses JWT Bearer token authentication. Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <your_token>
\`\`\`

## Roles
- **superadmin**: Full access to all resources across all schools
- **school_admin**: Limited access to their assigned school's resources

## Rate Limiting
- General endpoints: 100 requests per 15 minutes
- Authentication endpoints: 5 attempts per 15 minutes
            `,
            contact: {
                name: 'API Support'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your long token'
                }
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', description: 'User ID' },
                        username: { type: 'string', description: 'Username' },
                        email: { type: 'string', format: 'email', description: 'Email address' },
                        role: { 
                            type: 'string', 
                            enum: ['superadmin', 'school_admin'],
                            description: 'User role'
                        },
                        schoolId: { type: 'string', description: 'Associated school ID (for school_admin)' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                School: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', description: 'School ID' },
                        name: { type: 'string', description: 'School name' },
                        address: { type: 'string', description: 'School address' },
                        phone: { type: 'string', description: 'Phone number' },
                        email: { type: 'string', format: 'email', description: 'Email address' },
                        principal: { type: 'string', description: 'Principal name' },
                        establishedYear: { type: 'integer', description: 'Year established' },
                        isActive: { type: 'boolean', description: 'Active status' },
                        createdBy: { type: 'string', description: 'Creator user ID' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                Classroom: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', description: 'Classroom ID' },
                        name: { type: 'string', description: 'Classroom name' },
                        schoolId: { type: 'string', description: 'Associated school ID' },
                        capacity: { type: 'integer', description: 'Maximum student capacity' },
                        grade: { type: 'string', description: 'Grade level' },
                        section: { type: 'string', description: 'Section identifier' },
                        resources: { 
                            type: 'array', 
                            items: { type: 'string' },
                            description: 'Available resources'
                        },
                        academicYear: { type: 'string', description: 'Academic year (e.g., 2024-2025)' },
                        isActive: { type: 'boolean', description: 'Active status' },
                        createdBy: { type: 'string', description: 'Creator user ID' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                Student: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', description: 'Student ID' },
                        firstName: { type: 'string', description: 'First name' },
                        lastName: { type: 'string', description: 'Last name' },
                        email: { type: 'string', format: 'email', description: 'Email address' },
                        dateOfBirth: { type: 'string', format: 'date', description: 'Date of birth' },
                        gender: { 
                            type: 'string', 
                            enum: ['male', 'female', 'other'],
                            description: 'Gender'
                        },
                        schoolId: { type: 'string', description: 'Associated school ID' },
                        classroomId: { type: 'string', description: 'Associated classroom ID' },
                        enrollmentDate: { type: 'string', format: 'date-time', description: 'Enrollment date' },
                        guardianName: { type: 'string', description: 'Guardian name' },
                        guardianPhone: { type: 'string', description: 'Guardian phone number' },
                        guardianEmail: { type: 'string', format: 'email', description: 'Guardian email' },
                        address: { type: 'string', description: 'Student address' },
                        isActive: { type: 'boolean', description: 'Active status' },
                        transferHistory: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    fromSchool: { type: 'string' },
                                    toSchool: { type: 'string' },
                                    fromClassroom: { type: 'string' },
                                    toClassroom: { type: 'string' },
                                    date: { type: 'string', format: 'date-time' },
                                    reason: { type: 'string' }
                                }
                            }
                        },
                        createdBy: { type: 'string', description: 'Creator user ID' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        error: { type: 'string', description: 'Error message' }
                    }
                },
                ValidationError: {
                    type: 'object',
                    properties: {
                        errors: { 
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    label: { type: 'string' },
                                    message: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                Pagination: {
                    type: 'object',
                    properties: {
                        page: { type: 'integer', description: 'Current page number' },
                        limit: { type: 'integer', description: 'Items per page' },
                        total: { type: 'integer', description: 'Total number of items' },
                        pages: { type: 'integer', description: 'Total number of pages' }
                    }
                }
            },
            responses: {
                UnauthorizedError: {
                    description: 'Authentication required',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' },
                            example: { error: 'Authentication required' }
                        }
                    }
                },
                ForbiddenError: {
                    description: 'Access denied',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' },
                            example: { error: 'Access denied' }
                        }
                    }
                },
                NotFoundError: {
                    description: 'Resource not found',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' },
                            example: { error: 'Resource not found' }
                        }
                    }
                }
            }
        },
        tags: [
            { name: 'Authentication', description: 'User authentication endpoints' },
            { name: 'Users', description: 'User management endpoints' },
            { name: 'Schools', description: 'School management endpoints (Superadmin only)' },
            { name: 'Classrooms', description: 'Classroom management endpoints' },
            { name: 'Students', description: 'Student management endpoints' }
        ],
        paths: {
            '/api/user/createUser': {
                post: {
                    tags: ['Authentication'],
                    summary: 'Register a new user',
                    description: 'Create a new user account. For school_admin role, schoolId is required.',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['username', 'email', 'password', 'role'],
                                    properties: {
                                        username: { type: 'string', example: 'johndoe' },
                                        email: { type: 'string', format: 'email', example: 'john@example.com' },
                                        password: { type: 'string', minLength: 8, example: 'SecurePass123!' },
                                        role: { 
                                            type: 'string', 
                                            enum: ['superadmin', 'school_admin'],
                                            example: 'school_admin'
                                        },
                                        schoolId: { 
                                            type: 'string', 
                                            description: 'Required for school_admin role',
                                            example: '507f1f77bcf86cd799439011'
                                        }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'User created successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            user: { $ref: '#/components/schemas/User' },
                                            longToken: { type: 'string', description: 'JWT authentication token' }
                                        }
                                    }
                                }
                            }
                        },
                        '400': {
                            description: 'Validation error',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ValidationError' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/user/login': {
                post: {
                    tags: ['Authentication'],
                    summary: 'User login',
                    description: 'Authenticate user and receive a JWT token',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['email', 'password'],
                                    properties: {
                                        email: { type: 'string', format: 'email', example: 'john@example.com' },
                                        password: { type: 'string', example: 'SecurePass123!' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Login successful',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            user: { $ref: '#/components/schemas/User' },
                                            longToken: { type: 'string', description: 'JWT authentication token' }
                                        }
                                    }
                                }
                            }
                        },
                        '400': {
                            description: 'Invalid credentials',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Error' },
                                    example: { error: 'Invalid email or password' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/user/getUserProfile': {
                get: {
                    tags: ['Users'],
                    summary: 'Get current user profile',
                    description: 'Retrieve the authenticated user\'s profile information',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        '200': {
                            description: 'User profile retrieved successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            user: { $ref: '#/components/schemas/User' }
                                        }
                                    }
                                }
                            }
                        },
                        '401': { $ref: '#/components/responses/UnauthorizedError' }
                    }
                }
            },
            '/api/user/updateUser': {
                post: {
                    tags: ['Users'],
                    summary: 'Update user profile',
                    description: 'Update the authenticated user\'s profile information',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        username: { type: 'string', example: 'newusername' },
                                        email: { type: 'string', format: 'email', example: 'newemail@example.com' },
                                        password: { type: 'string', example: 'NewSecurePass123!' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'User updated successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            user: { $ref: '#/components/schemas/User' }
                                        }
                                    }
                                }
                            }
                        },
                        '401': { $ref: '#/components/responses/UnauthorizedError' }
                    }
                }
            },
            '/api/school/createSchool': {
                post: {
                    tags: ['Schools'],
                    summary: 'Create a new school',
                    description: 'Create a new school. **Superadmin only**',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['name'],
                                    properties: {
                                        name: { type: 'string', example: 'Springfield Elementary' },
                                        address: { type: 'string', example: '123 School St, Springfield' },
                                        phone: { type: 'string', example: '+1-555-0123' },
                                        email: { type: 'string', format: 'email', example: 'contact@springfield.edu' },
                                        principal: { type: 'string', example: 'Seymour Skinner' },
                                        establishedYear: { type: 'integer', example: 1990 }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'School created successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            school: { $ref: '#/components/schemas/School' }
                                        }
                                    }
                                }
                            }
                        },
                        '401': { $ref: '#/components/responses/UnauthorizedError' },
                        '403': { $ref: '#/components/responses/ForbiddenError' }
                    }
                }
            },
            '/api/school/getSchools': {
                get: {
                    tags: ['Schools'],
                    summary: 'List all schools',
                    description: 'Get a paginated list of all schools. **Superadmin only**',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Page number' },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 }, description: 'Items per page' },
                        { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by school name' },
                        { name: 'isActive', in: 'query', schema: { type: 'boolean' }, description: 'Filter by active status' }
                    ],
                    responses: {
                        '200': {
                            description: 'Schools retrieved successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            schools: {
                                                type: 'array',
                                                items: { $ref: '#/components/schemas/School' }
                                            },
                                            pagination: { $ref: '#/components/schemas/Pagination' }
                                        }
                                    }
                                }
                            }
                        },
                        '401': { $ref: '#/components/responses/UnauthorizedError' },
                        '403': { $ref: '#/components/responses/ForbiddenError' }
                    }
                }
            },
            '/api/school/getSchool': {
                get: {
                    tags: ['Schools'],
                    summary: 'Get a school by ID',
                    description: 'Retrieve detailed information about a specific school. **Superadmin only**',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'schoolId', in: 'query', required: true, schema: { type: 'string' }, description: 'School ID' }
                    ],
                    responses: {
                        '200': {
                            description: 'School retrieved successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            school: {
                                                allOf: [
                                                    { $ref: '#/components/schemas/School' },
                                                    {
                                                        type: 'object',
                                                        properties: {
                                                            classroomCount: { type: 'integer' },
                                                            studentCount: { type: 'integer' }
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        '401': { $ref: '#/components/responses/UnauthorizedError' },
                        '403': { $ref: '#/components/responses/ForbiddenError' },
                        '404': { $ref: '#/components/responses/NotFoundError' }
                    }
                }
            },
            '/api/school/updateSchool': {
                post: {
                    tags: ['Schools'],
                    summary: 'Update a school',
                    description: 'Update school details. **Superadmin only**',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['schoolId'],
                                    properties: {
                                        schoolId: { type: 'string', description: 'School ID to update' },
                                        name: { type: 'string' },
                                        address: { type: 'string' },
                                        phone: { type: 'string' },
                                        email: { type: 'string', format: 'email' },
                                        principal: { type: 'string' },
                                        establishedYear: { type: 'integer' },
                                        isActive: { type: 'boolean' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'School updated successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            school: { $ref: '#/components/schemas/School' }
                                        }
                                    }
                                }
                            }
                        },
                        '401': { $ref: '#/components/responses/UnauthorizedError' },
                        '403': { $ref: '#/components/responses/ForbiddenError' },
                        '404': { $ref: '#/components/responses/NotFoundError' }
                    }
                }
            },
            '/api/school/deleteSchool': {
                post: {
                    tags: ['Schools'],
                    summary: 'Delete a school',
                    description: 'Soft delete a school (sets isActive to false). **Superadmin only**',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['schoolId'],
                                    properties: {
                                        schoolId: { type: 'string', description: 'School ID to delete' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'School deleted successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            message: { type: 'string', example: 'School deleted successfully' }
                                        }
                                    }
                                }
                            }
                        },
                        '401': { $ref: '#/components/responses/UnauthorizedError' },
                        '403': { $ref: '#/components/responses/ForbiddenError' },
                        '404': { $ref: '#/components/responses/NotFoundError' }
                    }
                }
            },
            '/api/classroom/createClassroom': {
                post: {
                    tags: ['Classrooms'],
                    summary: 'Create a new classroom',
                    description: 'Create a new classroom. School admins can only create classrooms in their assigned school.',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['name', 'capacity'],
                                    properties: {
                                        schoolId: { type: 'string', description: 'School ID (required for superadmin, auto-assigned for school_admin)' },
                                        name: { type: 'string', example: 'Room 101' },
                                        capacity: { type: 'integer', example: 30 },
                                        grade: { type: 'string', example: '5th' },
                                        section: { type: 'string', example: 'A' },
                                        resources: { 
                                            type: 'array', 
                                            items: { type: 'string' },
                                            example: ['Projector', 'Whiteboard', 'Computer Lab']
                                        },
                                        academicYear: { type: 'string', example: '2024-2025' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Classroom created successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            classroom: { $ref: '#/components/schemas/Classroom' }
                                        }
                                    }
                                }
                            }
                        },
                        '401': { $ref: '#/components/responses/UnauthorizedError' },
                        '403': { $ref: '#/components/responses/ForbiddenError' }
                    }
                }
            },
            '/api/classroom/getClassrooms': {
                get: {
                    tags: ['Classrooms'],
                    summary: 'List classrooms',
                    description: 'Get a paginated list of classrooms. School admins only see their school\'s classrooms.',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'schoolId', in: 'query', schema: { type: 'string' }, description: 'Filter by school ID (superadmin only)' },
                        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Page number' },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 }, description: 'Items per page' },
                        { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by classroom name' },
                        { name: 'grade', in: 'query', schema: { type: 'string' }, description: 'Filter by grade' },
                        { name: 'academicYear', in: 'query', schema: { type: 'string' }, description: 'Filter by academic year' },
                        { name: 'isActive', in: 'query', schema: { type: 'boolean' }, description: 'Filter by active status' }
                    ],
                    responses: {
                        '200': {
                            description: 'Classrooms retrieved successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            classrooms: {
                                                type: 'array',
                                                items: { $ref: '#/components/schemas/Classroom' }
                                            },
                                            pagination: { $ref: '#/components/schemas/Pagination' }
                                        }
                                    }
                                }
                            }
                        },
                        '401': { $ref: '#/components/responses/UnauthorizedError' },
                        '403': { $ref: '#/components/responses/ForbiddenError' }
                    }
                }
            },
            '/api/classroom/getClassroom': {
                get: {
                    tags: ['Classrooms'],
                    summary: 'Get a classroom by ID',
                    description: 'Retrieve detailed information about a specific classroom.',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'classroomId', in: 'query', required: true, schema: { type: 'string' }, description: 'Classroom ID' }
                    ],
                    responses: {
                        '200': {
                            description: 'Classroom retrieved successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            classroom: {
                                                allOf: [
                                                    { $ref: '#/components/schemas/Classroom' },
                                                    {
                                                        type: 'object',
                                                        properties: {
                                                            studentCount: { type: 'integer' },
                                                            availableCapacity: { type: 'integer' }
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        '401': { $ref: '#/components/responses/UnauthorizedError' },
                        '403': { $ref: '#/components/responses/ForbiddenError' },
                        '404': { $ref: '#/components/responses/NotFoundError' }
                    }
                }
            },
            '/api/classroom/updateClassroom': {
                post: {
                    tags: ['Classrooms'],
                    summary: 'Update a classroom',
                    description: 'Update classroom details.',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['classroomId'],
                                    properties: {
                                        classroomId: { type: 'string', description: 'Classroom ID to update' },
                                        name: { type: 'string' },
                                        capacity: { type: 'integer' },
                                        grade: { type: 'string' },
                                        section: { type: 'string' },
                                        resources: { type: 'array', items: { type: 'string' } },
                                        academicYear: { type: 'string' },
                                        isActive: { type: 'boolean' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Classroom updated successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            classroom: { $ref: '#/components/schemas/Classroom' }
                                        }
                                    }
                                }
                            }
                        },
                        '401': { $ref: '#/components/responses/UnauthorizedError' },
                        '403': { $ref: '#/components/responses/ForbiddenError' },
                        '404': { $ref: '#/components/responses/NotFoundError' }
                    }
                }
            },
            '/api/classroom/deleteClassroom': {
                post: {
                    tags: ['Classrooms'],
                    summary: 'Delete a classroom',
                    description: 'Soft delete a classroom (sets isActive to false). Students in the classroom will be unassigned.',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['classroomId'],
                                    properties: {
                                        classroomId: { type: 'string', description: 'Classroom ID to delete' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Classroom deleted successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            message: { type: 'string', example: 'Classroom deleted successfully' }
                                        }
                                    }
                                }
                            }
                        },
                        '401': { $ref: '#/components/responses/UnauthorizedError' },
                        '403': { $ref: '#/components/responses/ForbiddenError' },
                        '404': { $ref: '#/components/responses/NotFoundError' }
                    }
                }
            },
            '/api/student/createStudent': {
                post: {
                    tags: ['Students'],
                    summary: 'Enroll a new student',
                    description: 'Enroll a new student. School admins can only enroll students in their assigned school.',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['firstName', 'lastName'],
                                    properties: {
                                        schoolId: { type: 'string', description: 'School ID (required for superadmin)' },
                                        classroomId: { type: 'string', description: 'Classroom ID to assign student' },
                                        firstName: { type: 'string', example: 'John' },
                                        lastName: { type: 'string', example: 'Doe' },
                                        email: { type: 'string', format: 'email', example: 'john.doe@student.edu' },
                                        dateOfBirth: { type: 'string', format: 'date', example: '2010-05-15' },
                                        gender: { type: 'string', enum: ['male', 'female', 'other'], example: 'male' },
                                        guardianName: { type: 'string', example: 'Jane Doe' },
                                        guardianPhone: { type: 'string', example: '+1-555-0124' },
                                        guardianEmail: { type: 'string', format: 'email', example: 'jane.doe@example.com' },
                                        address: { type: 'string', example: '456 Home St, Springfield' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Student enrolled successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            student: { $ref: '#/components/schemas/Student' }
                                        }
                                    }
                                }
                            }
                        },
                        '401': { $ref: '#/components/responses/UnauthorizedError' },
                        '403': { $ref: '#/components/responses/ForbiddenError' }
                    }
                }
            },
            '/api/student/getStudents': {
                get: {
                    tags: ['Students'],
                    summary: 'List students',
                    description: 'Get a paginated list of students. School admins only see their school\'s students.',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'schoolId', in: 'query', schema: { type: 'string' }, description: 'Filter by school ID' },
                        { name: 'classroomId', in: 'query', schema: { type: 'string' }, description: 'Filter by classroom ID' },
                        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Page number' },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 }, description: 'Items per page' },
                        { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by name or email' },
                        { name: 'gender', in: 'query', schema: { type: 'string', enum: ['male', 'female', 'other'] }, description: 'Filter by gender' },
                        { name: 'isActive', in: 'query', schema: { type: 'boolean' }, description: 'Filter by active status' }
                    ],
                    responses: {
                        '200': {
                            description: 'Students retrieved successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            students: {
                                                type: 'array',
                                                items: { $ref: '#/components/schemas/Student' }
                                            },
                                            pagination: { $ref: '#/components/schemas/Pagination' }
                                        }
                                    }
                                }
                            }
                        },
                        '401': { $ref: '#/components/responses/UnauthorizedError' },
                        '403': { $ref: '#/components/responses/ForbiddenError' }
                    }
                }
            },
            '/api/student/getStudent': {
                get: {
                    tags: ['Students'],
                    summary: 'Get a student by ID',
                    description: 'Retrieve detailed information about a specific student.',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'studentId', in: 'query', required: true, schema: { type: 'string' }, description: 'Student ID' }
                    ],
                    responses: {
                        '200': {
                            description: 'Student retrieved successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            student: { $ref: '#/components/schemas/Student' }
                                        }
                                    }
                                }
                            }
                        },
                        '401': { $ref: '#/components/responses/UnauthorizedError' },
                        '403': { $ref: '#/components/responses/ForbiddenError' },
                        '404': { $ref: '#/components/responses/NotFoundError' }
                    }
                }
            },
            '/api/student/updateStudent': {
                post: {
                    tags: ['Students'],
                    summary: 'Update a student',
                    description: 'Update student details.',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['studentId'],
                                    properties: {
                                        studentId: { type: 'string', description: 'Student ID to update' },
                                        classroomId: { type: 'string' },
                                        firstName: { type: 'string' },
                                        lastName: { type: 'string' },
                                        email: { type: 'string', format: 'email' },
                                        dateOfBirth: { type: 'string', format: 'date' },
                                        gender: { type: 'string', enum: ['male', 'female', 'other'] },
                                        guardianName: { type: 'string' },
                                        guardianPhone: { type: 'string' },
                                        guardianEmail: { type: 'string', format: 'email' },
                                        address: { type: 'string' },
                                        isActive: { type: 'boolean' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Student updated successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            student: { $ref: '#/components/schemas/Student' }
                                        }
                                    }
                                }
                            }
                        },
                        '401': { $ref: '#/components/responses/UnauthorizedError' },
                        '403': { $ref: '#/components/responses/ForbiddenError' },
                        '404': { $ref: '#/components/responses/NotFoundError' }
                    }
                }
            },
            '/api/student/deleteStudent': {
                post: {
                    tags: ['Students'],
                    summary: 'Delete/unenroll a student',
                    description: 'Soft delete a student (sets isActive to false).',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['studentId'],
                                    properties: {
                                        studentId: { type: 'string', description: 'Student ID to delete' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Student deleted successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            message: { type: 'string', example: 'Student deleted successfully' }
                                        }
                                    }
                                }
                            }
                        },
                        '401': { $ref: '#/components/responses/UnauthorizedError' },
                        '403': { $ref: '#/components/responses/ForbiddenError' },
                        '404': { $ref: '#/components/responses/NotFoundError' }
                    }
                }
            },
            '/api/student/transferStudent': {
                post: {
                    tags: ['Students'],
                    summary: 'Transfer a student',
                    description: 'Transfer a student to a different school or classroom. Creates a transfer history record.',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['studentId'],
                                    properties: {
                                        studentId: { type: 'string', description: 'Student ID to transfer' },
                                        toSchoolId: { type: 'string', description: 'Target school ID (for school transfer)' },
                                        toClassroomId: { type: 'string', description: 'Target classroom ID' },
                                        reason: { type: 'string', description: 'Reason for transfer', example: 'Family relocation' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Student transferred successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            student: { $ref: '#/components/schemas/Student' },
                                            transfer: {
                                                type: 'object',
                                                properties: {
                                                    fromSchool: { type: 'string' },
                                                    toSchool: { type: 'string' },
                                                    fromClassroom: { type: 'string' },
                                                    toClassroom: { type: 'string' },
                                                    date: { type: 'string', format: 'date-time' },
                                                    reason: { type: 'string' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        '401': { $ref: '#/components/responses/UnauthorizedError' },
                        '403': { $ref: '#/components/responses/ForbiddenError' },
                        '404': { $ref: '#/components/responses/NotFoundError' }
                    }
                }
            }
        }
    },
    apis: []
};

const specs = swaggerJsdoc(options);

module.exports = { swaggerUi, specs };
