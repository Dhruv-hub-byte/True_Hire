# TrueHire API Documentation

Complete API reference for the TrueHire platform.

## Base URL

```
http://localhost:3000/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Response Format

All responses are JSON with the following structure:

```json
{
  "data": { /* response data */ },
  "success": true,
  "timestamp": "2024-02-09T10:30:00Z"
}
```

## Error Handling

Error responses include:

```json
{
  "error": "Error message",
  "status": 400,
  "details": {}
}
```

Common HTTP Status Codes:
- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## Authentication Endpoints

### Register

Create a new user account.

**Request**
```
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "role": "CANDIDATE"  // ADMIN, INTERVIEWER, or CANDIDATE
}
```

**Response** (201 Created)
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "CANDIDATE"
  },
  "tokens": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

**Validation Requirements**
- Email: Valid email format
- Password: Min 8 chars, uppercase, lowercase, number, special char
- Name: Min 2 characters

---

### Login

Authenticate user and get tokens.

**Request**
```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response** (200 OK)
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "CANDIDATE"
  },
  "tokens": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

---

## Interview Endpoints

### List Interviews

Get all interviews for the authenticated user (filtered by role).

**Request**
```
GET /interviews
Authorization: Bearer <token>
```

**Response** (200 OK)
```json
[
  {
    "id": "interview_123",
    "title": "Senior Engineer Interview",
    "description": "Technical round",
    "status": "SCHEDULED",
    "startTime": "2024-02-15T10:00:00Z",
    "endTime": "2024-02-15T11:00:00Z",
    "duration": 60,
    "cheatingProbability": 0.15,
    "candidate": {
      "id": "user_456",
      "name": "Jane Smith",
      "email": "jane@example.com"
    },
    "interviewer": {
      "id": "user_789",
      "name": "John Interviewer"
    },
    "company": {
      "id": "company_123",
      "name": "Tech Corp"
    }
  }
]
```

---

### Create Interview

Schedule a new interview (Admin/Interviewer only).

**Request**
```
POST /interviews
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Senior Engineer Interview",
  "description": "Technical assessment",
  "startTime": "2024-02-15T10:00:00Z",
  "endTime": "2024-02-15T11:00:00Z",
  "duration": 60,
  "candidateId": "user_456",
  "companyId": "company_123"
}
```

**Response** (201 Created)
```json
{
  "id": "interview_123",
  "title": "Senior Engineer Interview",
  "status": "SCHEDULED",
  "startTime": "2024-02-15T10:00:00Z",
  "endTime": "2024-02-15T11:00:00Z",
  "duration": 60,
  "createdAt": "2024-02-09T10:30:00Z"
}
```

---

### Get Interview Details

Retrieve specific interview information.

**Request**
```
GET /interviews/:id
Authorization: Bearer <token>
```

**Response** (200 OK)
```json
{
  "id": "interview_123",
  "title": "Senior Engineer Interview",
  "status": "IN_PROGRESS",
  "startTime": "2024-02-15T10:00:00Z",
  "endTime": "2024-02-15T11:00:00Z",
  "duration": 60,
  "videoRecording": "https://s3.amazonaws.com/...",
  "audioRecording": "https://s3.amazonaws.com/...",
  "transcript": "Interview transcript...",
  "sentimentScore": 0.78,
  "confidenceScore": 0.85,
  "communicationScore": 0.82,
  "cheatingProbability": 0.12,
  "candidate": { /* candidate data */ },
  "interviewer": { /* interviewer data */ },
  "questions": [
    {
      "id": "q_1",
      "text": "Tell us about your experience",
      "type": "GENERAL",
      "answer": "I have 5 years of experience...",
      "timeSpent": 180
    }
  ],
  "violations": [
    {
      "id": "v_1",
      "type": "TAB_SWITCH",
      "description": "User switched tabs",
      "severity": 3,
      "timestamp": "2024-02-15T10:05:00Z"
    }
  ],
  "report": { /* report data */ },
  "chat": [ /* chat messages */ ]
}
```

---

### Update Interview

Update interview details (Admin/Interviewer only).

**Request**
```
PUT /interviews/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "status": "COMPLETED",
  "interviewerId": "user_789"
}
```

**Response** (200 OK)
```json
{
  "id": "interview_123",
  "title": "Updated Title",
  "status": "COMPLETED",
  "updatedAt": "2024-02-09T10:35:00Z"
}
```

---

### Delete Interview

Delete an interview (Admin only).

**Request**
```
DELETE /interviews/:id
Authorization: Bearer <token>
```

**Response** (200 OK)
```json
{
  "success": true,
  "message": "Interview deleted successfully"
}
```

---

## Violation Endpoints

### Get Violations

Retrieve all violations for an interview.

**Request**
```
GET /interviews/:id/violations
Authorization: Bearer <token>
```

**Response** (200 OK)
```json
[
  {
    "id": "v_1",
    "type": "TAB_SWITCH",
    "description": "User switched to another tab",
    "severity": 3,
    "timestamp": "2024-02-15T10:05:00Z",
    "user": {
      "id": "user_456",
      "name": "Jane Smith"
    }
  },
  {
    "id": "v_2",
    "type": "COPY_PASTE_ATTEMPT",
    "description": "User attempted to copy content",
    "severity": 4,
    "timestamp": "2024-02-15T10:12:00Z",
    "user": {
      "id": "user_456",
      "name": "Jane Smith"
    }
  }
]
```

---

### Record Violation

Log a new violation during an interview.

**Request**
```
POST /interviews/:id/violations
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "TAB_SWITCH",
  "description": "User switched tabs at 10:05 AM",
  "severity": 3
}
```

**Valid Violation Types**
- `TAB_SWITCH` - User switched to another tab
- `FOCUS_LOSS` - Interview window lost focus
- `COPY_PASTE_ATTEMPT` - Copy/paste attempt detected
- `RIGHT_CLICK_ATTEMPT` - Right-click attempted
- `TEXT_SELECTION_ATTEMPT` - Text selection attempt
- `MULTIPLE_MONITORS` - Multiple monitors detected
- `SUSPICIOUS_BEHAVIOR` - Other suspicious patterns

**Response** (201 Created)
```json
{
  "id": "v_3",
  "type": "TAB_SWITCH",
  "description": "User switched tabs at 10:05 AM",
  "severity": 3,
  "timestamp": "2024-02-15T10:05:00Z",
  "interviewId": "interview_123"
}
```

---

## Report Endpoints

### Get Report

Retrieve analysis report for a completed interview.

**Request**
```
GET /interviews/:id/report
Authorization: Bearer <token>
```

**Response** (200 OK)
```json
{
  "id": "report_123",
  "summary": "Candidate performed well overall...",
  "strengths": [
    "Strong communication skills",
    "Technical knowledge"
  ],
  "weaknesses": [
    "Needs improvement in system design"
  ],
  "recommendations": [
    "Consider for next round",
    "Discuss salary expectations"
  ],
  "overallScore": 8.2,
  "interviewId": "interview_123",
  "createdAt": "2024-02-15T11:30:00Z"
}
```

---

### Generate Report

Generate analysis report for an interview.

**Request**
```
POST /interviews/:id/report
Authorization: Bearer <token>
Content-Type: application/json

{
  "summary": "Interview assessment summary",
  "strengths": ["Strength 1", "Strength 2"],
  "weaknesses": ["Area for improvement 1"],
  "recommendations": ["Recommendation 1"],
  "overallScore": 8.5
}
```

**Response** (201 Created)
```json
{
  "id": "report_123",
  "summary": "Interview assessment summary",
  "strengths": ["Strength 1", "Strength 2"],
  "weaknesses": ["Area for improvement 1"],
  "recommendations": ["Recommendation 1"],
  "overallScore": 8.5,
  "interviewId": "interview_123"
}
```

---

## Health Check

### Status

Check API health and database connectivity.

**Request**
```
GET /health
```

**Response** (200 OK)
```json
{
  "status": "ok",
  "timestamp": "2024-02-09T10:30:00Z",
  "database": "connected",
  "version": "1.0.0"
}
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Authentication endpoints**: 5 requests per minute per IP
- **Other endpoints**: 100 requests per minute per token

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Total requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time (Unix timestamp)

---

## Webhook Events

TrueHire supports webhooks for real-time events:

- `interview.created`
- `interview.started`
- `interview.completed`
- `violation.recorded`
- `report.generated`

Subscribe to webhooks in your admin dashboard.

---

## SDK/Client Library

### JavaScript/TypeScript

```typescript
import { apiClient } from '@/lib/api-client'

// Register
await apiClient.register('user@example.com', 'Pass123!', 'John Doe', 'CANDIDATE')

// Login
await apiClient.login('user@example.com', 'Pass123!')

// Get interviews
const interviews = await apiClient.getInterviews()

// Create interview
await apiClient.createInterview({
  title: 'Interview',
  startTime: '2024-02-15T10:00:00Z',
  endTime: '2024-02-15T11:00:00Z',
  duration: 60,
  candidateId: 'user_456',
  companyId: 'company_123'
})
```

---

## Support

For API support:
- Email: api-support@truehire.com
- Documentation: https://docs.truehire.com
- GitHub Issues: https://github.com/truehire/issues
