# TrueHire - Secure Remote Interview Platform

A production-ready, enterprise-level online interview platform with advanced anti-cheating protection, real-time monitoring, and AI-powered analysis.

## Features

### Core Features
- **Secure Authentication**: JWT-based authentication with role-based access control (Admin, Interviewer, Candidate)
- **Interview Management**: Schedule, manage, and conduct remote interviews
- **Anti-Cheating Protection**: 
  - Fullscreen enforcement
  - Tab switch detection
  - Focus loss detection
  - Copy/paste blocking
  - Right-click blocking
  - Suspicious behavior monitoring
- **Live Monitoring**: Real-time candidate monitoring with violation tracking
- **Recording**: Video, audio, and screen recording capabilities
- **AI Analysis**: Speech-to-text transcription, sentiment analysis, and performance scoring
- **Dashboard Analytics**: Comprehensive analytics and reporting

### Technology Stack

#### Frontend
- Next.js 16 (App Router)
- TypeScript
- TailwindCSS
- shadcn/ui components
- Recharts for analytics
- Axios for HTTP requests
- Socket.io client for real-time updates

#### Backend
- Node.js runtime (Next.js API Routes)
- PostgreSQL database
- Prisma ORM
- JWT authentication
- bcryptjs for password hashing

#### Infrastructure
- Docker containerization
- PostgreSQL database
- Optional: AWS S3 for recording storage
- Optional: Redis for caching/sessions

## Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL 12+
- Git

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/truehire.git
cd truehire
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Configure the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/truehire"

# JWT Secrets (generate strong random strings)
JWT_SECRET="your_jwt_secret_key_here_min_32_chars"
JWT_REFRESH_SECRET="your_jwt_refresh_secret_key_here_min_32_chars"

# API URLs
NEXT_PUBLIC_API_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"

# AWS S3 (optional - for recordings)
AWS_ACCESS_KEY_ID="your_aws_access_key"
AWS_SECRET_ACCESS_KEY="your_aws_secret_key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="truehire-recordings"

# CORS
CORS_ORIGIN="http://localhost:3000"
```

### 4. Database Setup

Initialize and migrate the database:

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio for data management
npm run prisma:studio
```

### 5. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

## Project Structure

```
truehire/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/              # Authentication endpoints
│   │   ├── interviews/        # Interview management
│   │   └── [id]/              # Interview details
│   ├── auth/                  # Auth pages
│   │   ├── login/
│   │   └── register/
│   ├── dashboard/             # Dashboard pages
│   │   ├── admin/            # Admin dashboard
│   │   ├── candidate/        # Candidate dashboard
│   │   └── interviewer/      # Interviewer dashboard
│   ├── interview/            # Interview room
│   │   ├── [id]/            # Interview page
│   │   └── [id]/prepare/    # System check
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Home page
├── lib/
│   ├── auth.ts              # Auth utilities
│   ├── auth-context.tsx     # React context
│   ├── middleware.ts        # API middleware
│   ├── anti-cheat.ts       # Anti-cheat system
│   └── utils.ts             # Utility functions
├── components/
│   └── ui/                  # shadcn/ui components
├── prisma/
│   └── schema.prisma        # Database schema
├── public/                  # Static assets
├── .env.example             # Environment template
├── docker-compose.yml       # Docker compose config
├── Dockerfile               # Docker configuration
└── README.md                # This file
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user

### Interviews

- `GET /api/interviews` - Get all interviews (filtered by user role)
- `POST /api/interviews` - Create new interview
- `GET /api/interviews/[id]` - Get interview details
- `PUT /api/interviews/[id]` - Update interview
- `DELETE /api/interviews/[id]` - Delete interview

### Violations

- `GET /api/interviews/[id]/violations` - Get all violations
- `POST /api/interviews/[id]/violations` - Record violation

### Reports

- `GET /api/interviews/[id]/report` - Get interview report
- `POST /api/interviews/[id]/report` - Generate/update report

## Database Schema

### Users
- Authentication and profile information
- Role-based access control

### Interviews
- Interview scheduling and status tracking
- Recording URLs and analysis results

### Violations
- Anti-cheat violation logging
- Severity tracking

### Companies
- Organization management
- Admin user assignment

### Reports
- Interview analysis and summaries
- Performance scoring

See `prisma/schema.prisma` for complete schema.

## Anti-Cheat Features

The platform includes comprehensive anti-cheat protection:

1. **Fullscreen Enforcement**: Interview runs in fullscreen, cannot exit without termination
2. **Tab Switch Detection**: Detects and logs any attempt to switch tabs
3. **Focus Loss Monitoring**: Tracks window blur events
4. **Copy/Paste Blocking**: Prevents copying interview content
5. **Right-Click Prevention**: Disables context menu
6. **Developer Tools Blocking**: Prevents opening browser dev tools
7. **Keyboard Shortcut Monitoring**: Blocks Alt+Tab, F12, Ctrl+P
8. **Multiple Monitor Detection**: Warns about secondary displays
9. **Suspicious Behavior Logging**: Logs various suspicious patterns
10. **Violation Escalation**: Auto-terminates after excessive violations

## Role-Based Access Control

### Admin
- Create and manage companies
- Schedule and assign interviews
- View all analytics and reports
- Manage user accounts

### Interviewer
- Conduct interviews
- Monitor candidates in real-time
- Access interview recordings
- Generate reports

### Candidate
- View scheduled interviews
- Join interviews
- Upload materials
- View feedback reports

## Development Guide

### Adding New API Endpoints

1. Create route file in `app/api/[resource]/route.ts`
2. Use `withAuth` middleware for protected routes
3. Validate input with Zod schemas
4. Return proper HTTP status codes

```typescript
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { NextResponse } from 'next/server'

const handler = async (req: AuthenticatedRequest) => {
  // Your logic here
  return NextResponse.json({ data: 'response' })
}

export const POST = withAuth(handler)
```

### Adding UI Components

Use shadcn/ui components for consistency:

```typescript
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
```

## Production Deployment

### Docker Deployment

1. Build Docker image:
```bash
docker build -t truehire:latest .
```

2. Run with docker-compose:
```bash
docker-compose up -d
```

### Vercel Deployment

1. Connect GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy:
```bash
vercel deploy
```

### AWS Deployment

1. Set up RDS PostgreSQL instance
2. Create S3 bucket for recordings
3. Configure IAM roles
4. Deploy to EC2 or ECS

## Security Best Practices

- All passwords hashed with bcryptjs
- JWT tokens with expiration
- HTTPS enforced in production
- SQL injection prevention via Prisma
- XSS protection via Next.js
- CORS configured for allowed origins
- Rate limiting on authentication endpoints
- Secure cookies with httpOnly flag
- Input validation on all endpoints

## Testing

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## Troubleshooting

### Database Connection Issues
```bash
# Check DATABASE_URL is correct
# Verify PostgreSQL is running
psql $DATABASE_URL -c "SELECT 1"
```

### Camera/Microphone Not Working
- Check browser permissions
- Ensure HTTPS in production
- Check firewall settings

### Anti-Cheat Not Triggering
- Verify browser supports required APIs
- Check console for errors
- Review anti-cheat configuration

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: https://github.com/yourusername/truehire/issues
- Email: support@truehire.com
- Documentation: https://docs.truehire.com

## Roadmap

- [ ] Multi-language support
- [ ] AI-powered question recommendations
- [ ] Behavioral analysis
- [ ] Mobile app (React Native)
- [ ] Video interoperability
- [ ] Advanced reporting
- [ ] Integration with ATS systems
- [ ] Webhook support

## Credits

Built with:
- Next.js
- Prisma
- PostgreSQL
- TailwindCSS
- shadcn/ui
- Recharts

---

**TrueHire** - Making interviews truly secure and fair.
