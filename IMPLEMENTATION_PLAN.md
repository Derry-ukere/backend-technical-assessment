# School Management System API - Implementation Plan

## Overview
This document outlines the step-by-step plan to implement a School Management System API using the [axion template](https://github.com/qantra-io/axion). The system will manage Schools, Classrooms, and Students with role-based access control (RBAC).

---

## Phase 1: Project Setup (Day 1 - Morning)

### Step 1.1: Clone and Configure Template
```bash
# Clone the axion template
git clone https://github.com/qantra-io/axion.git .

# Install dependencies
npm install

# Additional dependencies needed
npm install mongoose express-rate-limit helmet express-validator swagger-jsdoc swagger-ui-express jest supertest
```

### Step 1.2: Environment Configuration
Create `.env` file with:
```env
SERVICE_NAME=school-management-api
USER_PORT=3000
MONGO_URI=mongodb://localhost:27017/school_management
CACHE_REDIS=redis://localhost:6379
CACHE_PREFIX=sms_cache
CORTEX_REDIS=redis://localhost:6379
CORTEX_PREFIX=sms_cortex
CORTEX_TYPE=parallel
OYSTER_REDIS=redis://localhost:6379
OYSTER_PREFIX=sms_oyster
LONG_TOKEN_SECRET=your-long-token-secret-here
SHORT_TOKEN_SECRET=your-short-token-secret-here
```

### Step 1.3: Update Config Files
- Modify `config/envs/development.js` and `config/envs/production.js`
- Update `config/index.config.js` with new environment variables

---

## Phase 2: Database Schema Design (Day 1 - Afternoon)

### Step 2.1: Design MongoDB Schemas

#### User Schema (`managers/entities/user/user.mongoModel.js`)
```javascript
{
  username: String (required, unique),
  email: String (required, unique),
  password: String (required, hashed),
  role: String (enum: ['superadmin', 'school_admin']),
  schoolId: ObjectId (ref: 'School', required for school_admin),
  createdAt: Date,
  updatedAt: Date
}
```

#### School Schema (`managers/entities/school/school.mongoModel.js`)
```javascript
{
  name: String (required),
  address: String,
  phone: String,
  email: String,
  principal: String,
  establishedYear: Number,
  isActive: Boolean (default: true),
  createdBy: ObjectId (ref: 'User'),
  createdAt: Date,
  updatedAt: Date
}
```

#### Classroom Schema (`managers/entities/classroom/classroom.mongoModel.js`)
```javascript
{
  name: String (required),
  schoolId: ObjectId (ref: 'School', required),
  capacity: Number (required),
  grade: String,
  section: String,
  resources: [String],
  academicYear: String,
  isActive: Boolean (default: true),
  createdBy: ObjectId (ref: 'User'),
  createdAt: Date,
  updatedAt: Date
}
```

#### Student Schema (`managers/entities/student/student.mongoModel.js`)
```javascript
{
  firstName: String (required),
  lastName: String (required),
  email: String (unique),
  dateOfBirth: Date,
  gender: String (enum: ['male', 'female', 'other']),
  schoolId: ObjectId (ref: 'School', required),
  classroomId: ObjectId (ref: 'Classroom'),
  enrollmentDate: Date,
  guardianName: String,
  guardianPhone: String,
  guardianEmail: String,
  address: String,
  isActive: Boolean (default: true),
  transferHistory: [{
    fromSchool: ObjectId,
    toSchool: ObjectId,
    fromClassroom: ObjectId,
    toClassroom: ObjectId,
    date: Date,
    reason: String
  }],
  createdBy: ObjectId (ref: 'User'),
  createdAt: Date,
  updatedAt: Date
}
```

### Step 2.2: Create MongoDB Models
Create Mongoose models for each entity following the template patterns.

---

## Phase 3: Authentication & Authorization (Day 1 - Evening)

### Step 3.1: Enhance User Manager
File: `managers/entities/user/User.manager.js`
- `createUser` - Register new users
- `login` - User authentication
- `getUserProfile` - Get current user details
- `updateUser` - Update user profile

### Step 3.2: Create Role-Based Middleware
File: `mws/__role.mw.js`
```javascript
// Middleware to check user roles
// - Superadmin: Full access to all resources
// - School Admin: Limited to their assigned school
```

### Step 3.3: Create School Access Middleware
File: `mws/__schoolAccess.mw.js`
```javascript
// Middleware to verify school-specific access
// Ensures school admins can only access their school's resources
```

### Step 3.4: Update Token Manager
Enhance `managers/token/Token.manager.js` to include:
- Role information in JWT payload
- School association for school admins

---

## Phase 4: Core Entity Managers (Day 2 - Full Day)

### Step 4.1: School Manager
File: `managers/entities/school/School.manager.js`

#### Exposed Methods (Superadmin only):
| Method | HTTP | Description |
|--------|------|-------------|
| `createSchool` | POST | Create a new school |
| `get=getSchools` | GET | List all schools with pagination |
| `get=getSchool` | GET | Get school by ID |
| `updateSchool` | PUT | Update school details |
| `deleteSchool` | DELETE | Soft delete a school |

### Step 4.2: Classroom Manager
File: `managers/entities/classroom/Classroom.manager.js`

#### Exposed Methods (School Admin):
| Method | HTTP | Description |
|--------|------|-------------|
| `createClassroom` | POST | Create a new classroom |
| `get=getClassrooms` | GET | List classrooms (filtered by school) |
| `get=getClassroom` | GET | Get classroom by ID |
| `updateClassroom` | PUT | Update classroom details |
| `deleteClassroom` | DELETE | Soft delete a classroom |

### Step 4.3: Student Manager
File: `managers/entities/student/Student.manager.js`

#### Exposed Methods (School Admin):
| Method | HTTP | Description |
|--------|------|-------------|
| `createStudent` | POST | Enroll a new student |
| `get=getStudents` | GET | List students with filters |
| `get=getStudent` | GET | Get student by ID |
| `updateStudent` | PUT | Update student details |
| `deleteStudent` | DELETE | Soft delete (unenroll) student |
| `transferStudent` | POST | Transfer student between schools/classrooms |

---

## Phase 5: Validation & Schema Files (Day 2 - Parallel)

### Step 5.1: Create Validation Schemas

#### User Validation (`managers/entities/user/user.schema.js`)
```javascript
{
  createUser: [
    { model: 'username', required: true },
    { model: 'email', required: true },
    { model: 'password', required: true },
    { model: 'role', required: true }
  ],
  login: [
    { model: 'email', required: true },
    { model: 'password', required: true }
  ]
}
```

#### School Validation (`managers/entities/school/school.schema.js`)
#### Classroom Validation (`managers/entities/classroom/classroom.schema.js`)
#### Student Validation (`managers/entities/student/student.schema.js`)

### Step 5.2: Common Validators
Update `managers/_common/schema.validators.js` with:
- Email validation
- Phone number validation
- ObjectId validation
- Date validation

---

## Phase 6: Security Implementation (Day 2 - Evening)

### Step 6.1: Rate Limiting
File: `mws/__rateLimit.mw.js`
```javascript
// Implement rate limiting
// - General: 100 requests per 15 minutes
// - Login: 5 attempts per 15 minutes
// - API: 1000 requests per hour
```

### Step 6.2: Security Middleware
File: `mws/__security.mw.js`
```javascript
// Implement security headers using helmet
// - XSS Protection
// - Content Security Policy
// - CORS configuration
```

### Step 6.3: Input Sanitization
- Implement input sanitization for all endpoints
- Prevent NoSQL injection attacks
- Validate and sanitize all user inputs

---

## Phase 7: API Documentation (Day 3 - Morning)

### Step 7.1: Swagger/OpenAPI Setup
File: `managers/docs/swagger.config.js`
- Configure Swagger UI
- Document all endpoints
- Include request/response examples

### Step 7.2: API Endpoint Documentation
Create comprehensive documentation for:
- Authentication endpoints
- School CRUD endpoints
- Classroom CRUD endpoints
- Student CRUD endpoints

### Step 7.3: README.md
Update README with:
- Project overview
- Setup instructions
- API documentation link
- Environment variables
- Database schema diagram

---

## Phase 8: Testing (Day 3 - Afternoon)

### Step 8.1: Set Up Testing Framework
```bash
npm install --save-dev jest supertest mongodb-memory-server
```

### Step 8.2: Create Test Structure
```
tests/
├── unit/
│   ├── user.test.js
│   ├── school.test.js
│   ├── classroom.test.js
│   └── student.test.js
├── integration/
│   ├── auth.test.js
│   ├── school.api.test.js
│   ├── classroom.api.test.js
│   └── student.api.test.js
└── setup.js
```

### Step 8.3: Test Cases
- Unit tests for each manager method
- Integration tests for API endpoints
- Authentication flow tests
- RBAC permission tests

---

## Phase 9: Deployment (Day 3 - Evening)

### Step 9.1: Deployment Configuration
- Create `Dockerfile`
- Create `docker-compose.yml`
- Configure CI/CD pipeline (GitHub Actions)

### Step 9.2: Production Setup
- Set up MongoDB Atlas (or managed MongoDB)
- Set up Redis Cloud (or managed Redis)
- Deploy to hosting platform (Railway/Render/Heroku)

### Step 9.3: Post-Deployment
- Verify all endpoints
- Test rate limiting
- Verify security headers
- Performance testing

---

## File Structure (Final)

```
├── cache/
│   ├── cache.dbh.js
│   └── redis-client.js
├── config/
│   ├── envs/
│   │   ├── development.js
│   │   └── production.js
│   └── index.config.js
├── connect/
│   └── mongo.js
├── libs/
│   └── utils.js
├── loaders/
│   ├── ManagersLoader.js
│   ├── MiddlewaresLoader.js
│   ├── MongoLoader.js
│   └── ValidatorsLoader.js
├── managers/
│   ├── _common/
│   │   ├── schema.models.js
│   │   └── schema.validators.js
│   ├── api/
│   │   └── Api.manager.js
│   ├── entities/
│   │   ├── user/
│   │   │   ├── User.manager.js
│   │   │   ├── user.schema.js
│   │   │   └── user.mongoModel.js
│   │   ├── school/
│   │   │   ├── School.manager.js
│   │   │   ├── school.schema.js
│   │   │   └── school.mongoModel.js
│   │   ├── classroom/
│   │   │   ├── Classroom.manager.js
│   │   │   ├── classroom.schema.js
│   │   │   └── classroom.mongoModel.js
│   │   └── student/
│   │       ├── Student.manager.js
│   │       ├── student.schema.js
│   │       └── student.mongoModel.js
│   ├── http/
│   │   └── UserServer.manager.js
│   ├── token/
│   │   └── Token.manager.js
│   └── response_dispatcher/
│       └── ResponseDispatcher.manager.js
├── mws/
│   ├── __token.mw.js
│   ├── __longToken.mw.js
│   ├── __role.mw.js          (NEW)
│   ├── __schoolAccess.mw.js  (NEW)
│   ├── __rateLimit.mw.js     (NEW)
│   └── __security.mw.js      (NEW)
├── tests/
│   ├── unit/
│   ├── integration/
│   └── setup.js
├── docs/
│   └── api-documentation.md
├── .env
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── package.json
├── README.md
└── index.js
```

---

## API Endpoints Summary

### Authentication
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/user/createUser` | Public | Register new user |
| POST | `/api/user/login` | Public | User login |
| GET | `/api/user/profile` | Authenticated | Get profile |

### Schools
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/school/createSchool` | Superadmin | Create school |
| GET | `/api/school/getSchools` | Superadmin | List all schools |
| GET | `/api/school/getSchool` | Superadmin | Get school by ID |
| PUT | `/api/school/updateSchool` | Superadmin | Update school |
| DELETE | `/api/school/deleteSchool` | Superadmin | Delete school |

### Classrooms
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/classroom/createClassroom` | School Admin | Create classroom |
| GET | `/api/classroom/getClassrooms` | School Admin | List classrooms |
| GET | `/api/classroom/getClassroom` | School Admin | Get classroom |
| PUT | `/api/classroom/updateClassroom` | School Admin | Update classroom |
| DELETE | `/api/classroom/deleteClassroom` | School Admin | Delete classroom |

### Students
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/student/createStudent` | School Admin | Enroll student |
| GET | `/api/student/getStudents` | School Admin | List students |
| GET | `/api/student/getStudent` | School Admin | Get student |
| PUT | `/api/student/updateStudent` | School Admin | Update student |
| DELETE | `/api/student/deleteStudent` | School Admin | Remove student |
| POST | `/api/student/transferStudent` | School Admin | Transfer student |

---

## Database Schema Diagram

```
┌─────────────┐       ┌──────────────┐       ┌──────────────┐
│    User     │       │    School    │       │  Classroom   │
├─────────────┤       ├──────────────┤       ├──────────────┤
│ _id         │       │ _id          │       │ _id          │
│ username    │       │ name         │       │ name         │
│ email       │       │ address      │       │ schoolId ────┼──┐
│ password    │       │ phone        │       │ capacity     │  │
│ role        │       │ email        │       │ grade        │  │
│ schoolId ───┼──┐    │ principal    │   ┌───┼─section      │  │
│ createdAt   │  │    │ isActive     │   │   │ resources    │  │
│ updatedAt   │  │    │ createdAt    │   │   │ createdAt    │  │
└─────────────┘  │    │ updatedAt    │   │   │ updatedAt    │  │
                │    └──────────────┘   │   └──────────────┘  │
                │            ▲          │           ▲          │
                │            │          │           │          │
                └────────────┼──────────┘           │          │
                             │                      │          │
                    ┌────────┴──────────────────────┴──────────┘
                    │
                    │        ┌──────────────┐
                    │        │   Student    │
                    │        ├──────────────┤
                    │        │ _id          │
                    │        │ firstName    │
                    │        │ lastName     │
                    │        │ email        │
                    └────────┤ schoolId     │
                             │ classroomId  │
                             │ dateOfBirth  │
                             │ gender       │
                             │ guardianName │
                             │ guardianPhone│
                             │ transferHist │
                             │ isActive     │
                             │ createdAt    │
                             │ updatedAt    │
                             └──────────────┘
```

---

## Timeline Summary

| Day | Phase | Tasks |
|-----|-------|-------|
| Day 1 AM | Setup | Clone template, configure environment, install dependencies |
| Day 1 PM | Database | Design and implement MongoDB schemas |
| Day 1 EVE | Auth | Implement authentication & authorization |
| Day 2 FULL | Core | Implement all entity managers (School, Classroom, Student) |
| Day 2 EVE | Security | Rate limiting, security headers, input validation |
| Day 3 AM | Docs | API documentation, Swagger setup, README |
| Day 3 PM | Testing | Unit tests, integration tests |
| Day 3 EVE | Deploy | Deployment, verification, submission |

---

## Key Architectural Decisions

1. **Following Axion Patterns**: All implementations follow the existing axion template structure with managers, schemas, and middlewares.

2. **JWT Authentication**: Using long tokens for persistent sessions and short tokens for active sessions (following existing pattern).

3. **Role-Based Access Control**: 
   - Superadmin: Full system access
   - School Admin: Restricted to their assigned school

4. **Soft Deletes**: Using `isActive` flag instead of hard deletes for data integrity.

5. **MongoDB**: Chosen for flexible schema and document relationships.

6. **Rate Limiting**: Different limits for different endpoints to prevent abuse.

---

## Assumptions

1. A user can only be assigned to one school (for school admins)
2. Students can be transferred between schools/classrooms with history tracking
3. Soft delete is preferred over hard delete
4. Superadmin accounts are created via seed script or first registration
5. Email is unique across all users
6. Classroom capacity is enforced during student enrollment

---

## Next Steps

After this plan is approved, proceed with:
1. Clone and set up the axion template
2. Implement the database schemas
3. Build the authentication system
4. Implement core entity managers
5. Add security measures
6. Write tests
7. Deploy and document

---

**Ready to start implementation? Let me know and we can begin with Phase 1!**
