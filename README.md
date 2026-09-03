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
5. **Engineer** must acknowledge the decision (mutually exclusive paths):
   - Acknowledge → APPROVED/REJECTED → RESOLVED, terminal (audit entry)
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

### General
- Follows Monolithic architecture
- JWT is stored as an httpOnly cookie (not in the response body or Authorization header).
- Email delivery is simulated via a MailOutbox collection (no SMTP).
- Audit logs capture who did what, when, and before/after state.

### Workflow semantics
- Engineers must explicitly acknowledge an approval or rejection before a task is considered resolved.
- After a rejection, acknowledge and resubmit are mutually exclusive: acknowledging closes the task (`RESOLVED`), resubmitting reopens it for rework (`IN_PROGRESS`).
- `RESOLVED` is terminal — an acknowledged task cannot be resubmitted or reopened, and no reopen endpoint exists.
- Rejection reason is optional; when provided it is stored in the audit metadata and included in the notification and mail body.

### Notifications scope
- In-app notifications and mail outbox records are produced only for approve/reject decisions. Assignment, start, submit, acknowledge, and resubmit produce audit entries only.

### Data & validation defaults
- Due date must be a valid parseable date string (future dates are not enforced).
- Priority defaults to `MEDIUM` when omitted; allowed values are `LOW`, `MEDIUM`, `HIGH`.
- One engineer per task; no reassignment, edit, or delete endpoints (out of scope per assignment §4).

### Access control
- Only Managers can create/approve/reject tasks; only Engineers can start/submit/acknowledge/resubmit them.
- Managers can only approve/reject tasks they created; Engineers can only act on tasks assigned to them.
- Task detail and audit log are visible only to that task's manager or engineer (403 otherwise); cross-user access returns 404/403 without leaking task existence.

### Infrastructure
- Approval operations use sequential writes (task → audit → notification → mail outbox) instead of MongoDB transactions, so the API works on any deployment including standalone servers (transactions require a replica set). If full atomicity is needed, run MongoDB as a replica set and wrap each approval operation in a session/transaction.
