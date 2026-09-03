# PCC Backend — Task Assignment & Approval Workflow

A small REST API demonstrating a task assignment → approval → notification/audit workflow for engineering and design teams.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js (ES Modules) |
| Framework | Express 5 |
| Database | MongoDB (Mongoose 9) |
| Authentication | JWT (httpOnly cookie) |
| Password Hashing | bcryptjs |

## Prerequisites

- Node.js ≥ 18
- MongoDB instance (local or Atlas)

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create `.env` file** (see `.env.example`)
   ```
   NODE_ENV=development
   PORT=5000
   JWT_SECRET=your-secret-key-here
   MONGO_URI=mongodb://localhost:27017/pcc
   ```

3. **Start the server**
   ```bash
   npm run dev    # development (nodemon)
   npm run start  # production
   ```

4. **Run tests**
   ```bash
   npm test
   ```

## API Endpoints

### Authentication

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/api/auth/register` | No | — | Register a new user |
| POST | `/api/auth/login` | No | — | Login, sets JWT cookie |
| POST | `/api/auth/logout` | Yes | Any | Clear JWT cookie |

### Tasks

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/api/tasks` | Yes | MANAGER | Create & assign a task |
| GET | `/api/tasks/my` | Yes | ENGINEER | List own assigned tasks |
| GET | `/api/tasks/managed` | Yes | MANAGER | List tasks you created |
| GET | `/api/tasks/:taskId` | Yes | Any* | Get task detail |
| GET | `/api/tasks/:taskId/audit` | Yes | Any* | Get audit log for task |
| PATCH | `/api/tasks/:taskId/start` | Yes | ENGINEER | Start a task |
| POST | `/api/tasks/:taskId/submit` | Yes | ENGINEER | Submit for review |

*Any authenticated user who is the manager or engineer of that task.

### Approval Workflow

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/api/tasks/:taskId/approve` | Yes | MANAGER | Approve submitted task |
| POST | `/api/tasks/:taskId/reject` | Yes | MANAGER | Reject submitted task |
| POST | `/api/tasks/:taskId/acknowledge` | Yes | ENGINEER | Acknowledge decision |
| POST | `/api/tasks/:taskId/resubmit` | Yes | ENGINEER | Resubmit rejected task |

### Notifications

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/notifications` | Yes | Any | List own notifications |
| PATCH | `/api/notifications/:id/read` | Yes | Any | Mark notification read |

## Task State Machine

```
NOT_STARTED → IN_PROGRESS → SUBMITTED → APPROVED → RESOLVED
                                    ↘ REJECTED → RESOLVED
                                        ↘ IN_PROGRESS (resubmit)
```

## Workflow Summary

1. **Manager** creates a task → assigns to an Engineer (status: NOT_STARTED)
2. **Engineer** starts the task (NOT_STARTED → IN_PROGRESS)
3. **Engineer** submits for review (IN_PROGRESS → SUBMITTED)
4. **Manager** approves or rejects:
   - **Approve** → SUBMITTED → APPROVED (audit + notification + mail outbox)
   - **Reject** → SUBMITTED → REJECTED (audit + notification + mail outbox with reason)
5. **Engineer** must acknowledge the decision:
   - Acknowledge → APPROVED/REJECTED → RESOLVED (audit entry)
   - Or resubmit (if rejected) → REJECTED → IN_PROGRESS (audit entry)

## Response Format

All responses follow a consistent shape:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Task fetched successfully",
  "data": { ... },
  "errors": []
}
```

## Assumptions

- JWT is stored as an httpOnly cookie (not in the response body or Authorization header).
- Email delivery is simulated via a MailOutbox collection (no SMTP).
- Audit logs capture who did what, when, and before/after state.
- Engineers must explicitly acknowledge approval/rejection before a task is considered resolved.
- Role-based access: only Managers can create/approve/reject tasks; only Engineers can start/submit/acknowledge/resubmit tasks.
