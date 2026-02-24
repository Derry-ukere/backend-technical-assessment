# School Management System API

A RESTful API for managing schools, classrooms, and students with role-based access control (RBAC).

## Features

- **Role-Based Access Control (RBAC)**
  - Superadmin: Full system access
  - School Administrator: School-specific access

- **Core Entities**
  - Schools: CRUD operations, profile management
  - Classrooms: Capacity and resource management
  - Students: Enrollment, transfers, profile management

- **Security**
  - JWT-based authentication
  - Rate limiting
  - Input validation
  - Security headers (Helmet)

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js (via Axion template)
- **Database**: MongoDB with Mongoose
- **Cache**: Redis
- **Authentication**: JWT (jsonwebtoken)

## Prerequisites

- Node.js >= 18.x
- MongoDB >= 6.x
- Redis >= 7.x

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Derry-ukere/backend-technical-assessment.git
   cd backend-technical-assessment
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB and Redis**
   ```bash
   # Using Docker (recommended)
   docker run -d -p 27017:27017 --name mongodb mongo:6
   docker run -d -p 6379:6379 --name redis redis:7
   ```

5. **Run the application**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVICE_NAME` | Service identifier | school-management-api |
| `ENV` | Environment (development/production) | development |
| `USER_PORT` | API server port | 3000 |
| `MONGO_URI` | MongoDB connection string | mongodb://localhost:27017/school_management |
| `REDIS_URI` | Redis connection string | redis://127.0.0.1:6379 |
| `LONG_TOKEN_SECRET` | JWT long token secret | (required) |
| `SHORT_TOKEN_SECRET` | JWT short token secret | (required) |
| `NACL_SECRET` | Encryption secret | (required) |

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/user/register` | Register a new user |
| POST | `/api/user/login` | User login |

### Schools (Superadmin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/school/createSchool` | Create a new school |
| GET | `/api/school/getSchools` | List all schools |
| GET | `/api/school/getSchool` | Get school by ID |
| PUT | `/api/school/updateSchool` | Update school |
| DELETE | `/api/school/deleteSchool` | Delete school |

### Classrooms (School Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/classroom/createClassroom` | Create classroom |
| GET | `/api/classroom/getClassrooms` | List classrooms |
| GET | `/api/classroom/getClassroom` | Get classroom |
| PUT | `/api/classroom/updateClassroom` | Update classroom |
| DELETE | `/api/classroom/deleteClassroom` | Delete classroom |

### Students (School Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/student/createStudent` | Enroll student |
| GET | `/api/student/getStudents` | List students |
| GET | `/api/student/getStudent` | Get student |
| PUT | `/api/student/updateStudent` | Update student |
| DELETE | `/api/student/deleteStudent` | Remove student |
| POST | `/api/student/transferStudent` | Transfer student |

## API Documentation

Interactive API documentation is available via Swagger UI at:
```
http://localhost:3000/api-docs
```

You can also access the OpenAPI specification in JSON format at:
```
http://localhost:3000/api-docs.json
```

### Authentication
All protected endpoints require a JWT Bearer token in the Authorization header:
```
Authorization: Bearer <your_token>
```

## Database Schema

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

## Project Structure

```
├── config/              # Configuration files
├── connect/             # Database connections
├── loaders/             # Module loaders
├── managers/            # Business logic managers
│   ├── entities/        # Entity managers (user, school, classroom, student)
│   ├── api/             # API handler
│   ├── http/            # HTTP server
│   └── token/           # Token management
├── mws/                 # Middlewares
├── tests/               # Test files
└── index.js             # Application entry point
```

## Testing

```bash
# Run all tests
npm test

# Run tests with watch mode
npm run test:watch

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration
```

## Deployment

### Branch Strategy

| Branch | Environment | Docker Tag | Description |
|--------|-------------|------------|-------------|
| `develop` | Development | `dev`, `dev-<sha>` | Active development |
| `staging` | Staging | `staging`, `staging-<sha>` | Pre-production testing |
| `main` | Production | `latest`, `prod`, `prod-<sha>` | Production releases |

### Docker Hub

The application is automatically built and pushed to Docker Hub based on branch.

**Docker Hub Repository:** `derryukere/school-management-api`

#### Pull Images by Environment

```bash
# Development
docker pull derryukere/school-management-api:dev

# Staging
docker pull derryukere/school-management-api:staging

# Production
docker pull derryukere/school-management-api:latest
# or
docker pull derryukere/school-management-api:prod
```

#### Run Container

```bash
docker run -d \
  -p 3000:3000 \
  -e MONGO_URI=mongodb://your-mongo-host:27017/school_management \
  -e REDIS_URI=redis://your-redis-host:6379 \
  -e CORTEX_REDIS=redis://your-redis-host:6379 \
  -e CORTEX_PREFIX=sms_cortex \
  -e CORTEX_TYPE=school-management-api \
  -e OYSTER_REDIS=redis://your-redis-host:6379 \
  -e OYSTER_PREFIX=sms_oyster \
  -e CACHE_REDIS=redis://your-redis-host:6379 \
  -e CACHE_PREFIX=sms_cache \
  -e LONG_TOKEN_SECRET=your-secret \
  -e SHORT_TOKEN_SECRET=your-secret \
  -e NACL_SECRET=your-secret \
  derryukere/school-management-api:prod
```

#### Build Locally

```bash
# Build the image
docker build -t school-management-api .

# Tag for Docker Hub
docker tag school-management-api derryukere/school-management-api:dev

# Push to Docker Hub
docker push derryukere/school-management-api:dev
```

### CI/CD Pipeline

The project includes GitHub Actions workflows:

- **CI/CD Pipeline** (`.github/workflows/ci-cd.yml`)
  - Runs tests on every push and PR
  - Builds and pushes Docker image with environment-specific tags
  - `develop` → `:dev`, `:dev-<sha>`
  - `staging` → `:staging`, `:staging-<sha>`
  - `main` → `:latest`, `:prod`, `:prod-<sha>`

- **Security Scan** (`.github/workflows/security.yml`)
  - Weekly dependency audits
  - Docker image vulnerability scanning
  - CodeQL analysis for code security

#### Setting up Docker Hub Token

1. Go to [Docker Hub Account Settings](https://hub.docker.com/settings/security)
2. Create a new Access Token
3. Add `DOCKER_HUB_TOKEN` secret in your GitHub repository settings

### Production Checklist

Before deploying to production:

- [ ] Set strong, unique values for all secrets (`LONG_TOKEN_SECRET`, `SHORT_TOKEN_SECRET`, `NACL_SECRET`)
- [ ] Use managed MongoDB (MongoDB Atlas) with authentication
- [ ] Use managed Redis with authentication (Redis Cloud)
- [ ] Enable HTTPS/TLS
- [ ] Configure proper CORS origins
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting for your expected load
- [ ] Set up database backups
- [ ] Review security headers

## License

ISC
