# TrueHire Development Guide

Complete guide for setting up and developing TrueHire locally.

## Quick Start

### 1. Prerequisites

- Node.js 18+ (download from nodejs.org)
- PostgreSQL 12+ (download from postgresql.org)
- Git

### 2. Clone & Setup

```bash
# Clone repository
git clone https://github.com/yourusername/truehire.git
cd truehire

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local with your settings
nano .env.local
```

### 3. Database Setup

```bash
# Create database
createdb truehire

# Run migrations
npm run prisma:migrate

# (Optional) View database with Prisma Studio
npm run prisma:studio
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

## Project Structure

```
truehire/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes (backend)
│   │   ├── auth/                # Authentication endpoints
│   │   │   ├── login/route.ts
│   │   │   ├── register/route.ts
│   │   │   └── logout/route.ts
│   │   ├── interviews/          # Interview management
│   │   │   ├── route.ts         # List/Create
│   │   │   ├── [id]/
│   │   │   │   ├── route.ts     # Get/Update/Delete
│   │   │   │   └── violations/
│   │   │   │       └── route.ts # Violations API
│   │   └── health/route.ts       # Health check
│   ├── auth/                     # Auth pages
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── dashboard/                # Dashboard pages
│   │   ├── layout.tsx            # Dashboard wrapper
│   │   ├── page.tsx              # Redirect to role dashboard
│   │   ├── admin/
│   │   │   └── page.tsx          # Admin dashboard
│   │   ├── candidate/
│   │   │   └── page.tsx          # Candidate dashboard
│   │   └── interviewer/
│   │       └── page.tsx          # Interviewer dashboard
│   ├── interview/                # Interview pages
│   │   └── [id]/
│   │       ├── page.tsx          # Interview room
│   │       ├── prepare/
│   │       │   └── page.tsx      # System check
│   │       └── report/
│   │           └── page.tsx      # Interview report
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles
├── lib/
│   ├── auth.ts                  # Auth utilities (JWT, bcrypt)
│   ├── auth-context.tsx         # React context for auth state
│   ├── api-client.ts            # Axios client with interceptors
│   ├── middleware.ts            # API middleware (auth, roles, CORS)
│   ├── anti-cheat.ts            # Anti-cheat monitoring system
│   ├── utils.ts                 # Utility functions (cn helper)
│   └── validators.ts            # Zod schemas for validation
├── components/
│   └── ui/                      # shadcn/ui components (auto-generated)
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── badge.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── tabs.tsx
│       ├── alert.tsx
│       └── ... (and more)
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── migrations/              # Migration files
├── public/                      # Static assets
│   ├── icon.svg
│   ├── apple-icon.png
│   └── ...
├── .env.example                 # Environment template
├── .env.local                   # Local environment (git-ignored)
├── Dockerfile                   # Docker configuration
├── docker-compose.yml           # Docker compose for full stack
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── tailwind.config.ts           # Tailwind CSS config
├── next.config.mjs              # Next.js config
├── prisma.schema                # Prisma config
├── README.md                    # Project README
├── API_DOCUMENTATION.md         # API docs
└── DEVELOPMENT.md               # This file
```

## Development Workflows

### Adding a New Page

1. Create directory structure in `app/`
2. Add `page.tsx` file
3. Use existing components and utilities

Example:
```typescript
'use client'

import { useAuth } from '@/lib/auth-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function MyPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Welcome, {user?.name}</h1>
      {/* Your content */}
    </div>
  )
}
```

### Adding a New API Endpoint

1. Create route file: `app/api/resource/route.ts`
2. Import middleware
3. Implement handlers

Example:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { z } from 'zod'

const prisma = new PrismaClient()

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})

async function POST(req: AuthenticatedRequest) {
  try {
    const body = await req.json()
    const validation = createSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      )
    }

    // Your logic here
    const data = validation.data

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export { POST }
```

### Using the Auth Context

```typescript
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'

export default function MyComponent() {
  const { user, accessToken, isAuthenticated, login, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/auth/login')
  }

  return (
    <>
      {isAuthenticated && <p>Welcome, {user?.name}!</p>}
      <button onClick={handleLogout}>Logout</button>
    </>
  )
}
```

### Making API Calls

```typescript
import { apiClient } from '@/lib/api-client'

// Using pre-built methods
const interviews = await apiClient.getInterviews()

// Using custom request
const response = await apiClient.request('GET', '/interviews?status=SCHEDULED')

// With error handling
try {
  const interview = await apiClient.getInterview('interview_123')
} catch (error) {
  console.error('Failed to fetch:', error)
}
```

### Adding UI Components

TrueHire uses shadcn/ui. Add components via CLI:

```bash
# Add a new component
npx shadcn-ui@latest add component-name

# Examples
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add table
npx shadcn-ui@latest add form
```

## Database Management

### Prisma Commands

```bash
# Generate Prisma client
npm run prisma:generate

# Create and run migrations
npm run prisma:migrate

# Push schema to database (without migrations)
npm run prisma:push

# Open Prisma Studio (GUI for database)
npm run prisma:studio

# Seed database with test data
npx prisma db seed
```

### Create a Migration

```bash
# After modifying schema.prisma
npm run prisma:migrate -- --name describe_change

# Example
npm run prisma:migrate -- --name add_user_phone_field
```

## Testing

### Manual Testing

```bash
# Test registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!","name":"Test User"}'

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'

# Test protected endpoint
curl -X GET http://localhost:3000/api/interviews \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Unit Testing

```bash
# Run tests
npm test

# Run specific test file
npm test -- auth.test.ts

# With coverage
npm test -- --coverage
```

## Debugging

### Browser DevTools

1. Open Chrome DevTools (F12)
2. Network tab to monitor API calls
3. Console tab for errors
4. Application tab to view localStorage

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js",
      "type": "node",
      "request": "attach",
      "port": 9229
    }
  ]
}
```

Run with:
```bash
NODE_OPTIONS='--inspect' npm run dev
```

### Prisma Studio

```bash
npm run prisma:studio
# Opens at http://localhost:5555
```

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for signing JWT tokens
- `JWT_REFRESH_SECRET` - Secret for refresh tokens

### Recommended
- `NEXT_PUBLIC_API_URL` - Frontend API base URL
- `CORS_ORIGIN` - Allowed CORS origins
- `NODE_ENV` - Set to 'development' or 'production'

### Optional
- `AWS_*` - AWS S3 for recordings
- `REDIS_URL` - Redis for caching
- `SMTP_*` - Email configuration

## Performance Tips

### Frontend
- Use React.memo for heavy components
- Implement pagination for large lists
- Lazy load images and components
- Use SWR for caching

### Backend
- Add database indexes on frequently queried fields
- Use connection pooling (PgBouncer)
- Implement response caching with Redis
- Use query optimization

### General
- Monitor bundle size: `npm run build`
- Use Next.js Image component
- Enable compression in production
- Use CDN for static assets

## Troubleshooting

### "Database connection failed"
```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Restart PostgreSQL
brew services restart postgresql  # macOS
# or
sudo systemctl restart postgresql  # Linux
```

### "Module not found"
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### "Port 3000 already in use"
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

### "Prisma migration issues"
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Or manually clear and re-migrate
npm run prisma:push
```

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/amazing-feature

# Make changes and commit
git add .
git commit -m "feat: add amazing feature"

# Push and create PR
git push origin feature/amazing-feature
```

## Deployment Preparation

```bash
# Build for production
npm run build

# Start production server
npm run start

# Test production build locally
NODE_ENV=production npm run start
```

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [TailwindCSS](https://tailwindcss.com)
- [Zod Validation](https://zod.dev)

## Support

For development questions:
- Check existing issues on GitHub
- Ask in the team chat
- Create new GitHub issue
- Email dev-support@truehire.com
