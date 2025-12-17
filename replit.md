# Microbus Booking API

## Overview

This is an enterprise-grade microbus station booking system built with NestJS and TypeScript. The system manages physical microbus stations where drivers arrive, open sessions, and passengers book seats in real-time. Core concepts include Routes (with ordered Stations), Driver Sessions (representing a vehicle waiting to depart), and real-time seat booking with temporary holds before payment confirmation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Framework
- **NestJS** with modular architecture - each domain (auth, bookings, sessions, etc.) is a self-contained module with its own controller, service, and DTOs
- **TypeScript** in non-strict mode for faster development
- REST API only (no GraphQL) with global `/api` prefix

### Authentication & Authorization
- JWT-based authentication with access and refresh tokens
- Multiple auth methods:
  - **Google OAuth** - Mobile apps send Google ID token, server verifies and creates/links account
  - **Email/Password** - Traditional registration and login with bcrypt password hashing
  - **Phone OTP** - SMS-based verification for phone-first authentication
- Password reset flow with secure tokens (revokes all refresh tokens on reset)
- Logout endpoints: single device and all devices
- Role-based access control (PASSENGER, DRIVER, ADMIN) using custom guards and decorators
- Passport.js integration with JWT strategy

### Auth Endpoints (POST /api/auth/...)
- `google` - Login/register with Google ID token
- `email/register` - Register with email and password
- `email/login` - Login with email and password
- `request-otp` - Request OTP for phone verification
- `verify-otp` - Verify OTP and get tokens
- `forgot-password` - Request password reset email
- `reset-password` - Reset password with token
- `refresh-token` - Get new access token
- `logout` - Invalidate single refresh token
- `logout-all` - Invalidate all refresh tokens (requires auth)
- `register-driver` - Register as driver (pending admin approval)

### Database Layer
- **Prisma ORM** for database operations (schema not visible but referenced throughout)
- PostgreSQL as the intended database (ACID-compliant for transaction safety)
- Transaction support for critical operations like seat booking

### Caching & Locking
- **Redis** for distributed locking (prevents race conditions on seat bookings), caching (routes, stations with 5-minute TTL), and session management
- Graceful degradation - system works without Redis but logs warnings

### Real-time Communication
- **Socket.IO** via `@nestjs/websockets` for real-time seat availability updates
- WebSocket namespace `/realtime` with room-based subscriptions (sessions, drivers)
- Events emitted for session updates, seat changes, and bookings

### Key Domain Modules
1. **Auth** - Multi-method authentication, OTP handling, password reset
2. **Sessions** - Driver session lifecycle (start, close, manage capacity)
3. **Bookings** - Temporary seat holds (5-minute TTL) before payment
4. **Payments** - Idempotent payment processing with service fee calculation
5. **Payouts** - Driver earnings management after session completion
6. **Routes/Stations** - Geographic route management with ordered stations
7. **Audit** - Activity logging for admin oversight

### API Documentation
- Swagger/OpenAPI at `/api/docs`
- All endpoints tagged and documented with DTOs

### Request Validation
- Class-validator for DTO validation with whitelist mode
- Global validation pipe with automatic type transformation

## External Dependencies

### Required Services
- **PostgreSQL** - Primary database (configure via Prisma)
- **Redis** - Caching and distributed locks (optional but recommended for production)

### Third-Party APIs
- **Google Auth Library** - Google OAuth token verification (requires `GOOGLE_CLIENT_ID` env var)

### Environment Variables Needed
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string (optional)
- `JWT_SECRET` - Secret for JWT signing (has default fallback)
- `GOOGLE_CLIENT_ID` - For Google OAuth (optional)
- `PORT` - Server port (defaults to 5000)

### NPM Scripts
- `npm run build` - Compile TypeScript
- `npm run start` - Run compiled code
- `npm run start:dev` - Development with ts-node
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:push` - Push schema to database