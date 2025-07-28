# CryptoInvest Pro - Cryptocurrency Investment Dashboard

## Overview

CryptoInvest Pro is a full-stack web application that provides users with a comprehensive cryptocurrency investment platform. The application integrates with Gemini exchange API to track portfolio performance, supports Stripe payments for subscription management, and offers real-time portfolio analytics. Built with modern web technologies, it features a React frontend with shadcn/ui components and an Express.js backend with PostgreSQL database storage.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### Password Encryption Implementation (July 27, 2025)
- Implemented secure password storage using bcrypt with 12 salt rounds
- Added password hashing utility functions in server/auth.ts
- Updated user creation and authentication to use encrypted passwords
- Modified signin endpoint to use verifyUserPassword method with bcrypt comparison
- Enhanced password change functionality with encrypted verification
- Updated storage layer methods (createUser, upsertUser, updateUser) to automatically hash passwords
- Added verifyUserPassword method to storage interface for secure authentication

### Email Uniqueness Validation (July 27, 2025)
- Implemented email uniqueness validation to prevent duplicate user registrations
- Added database-level unique constraint on email field in users table
- Added application-level validation in both /api/send-otp and /api/verify-otp endpoints
- Added email uniqueness check in legacy /api/register endpoint for backward compatibility
- Enhanced error handling with proper database constraint violation messages
- Users now receive clear feedback when attempting to register with existing email addresses

### UI/UX Fixes (July 26, 2025)
- Fixed duplicate landing page rendering issue in App.tsx routing
- Removed redundant Landing component calls from AuthenticatedApp and Router
- Fixed sign-out button 404 error by correcting endpoint from /api/logout to /api/signout
- Streamlined routing logic for cleaner user experience
- Fixed sidebar tab highlighting issue using useLocation hook for dynamic styling
- Updated investment controls section to remove AI references and add SGD fund guidance

### Portfolio Dashboard Enhancements (July 27, 2025)
- Enhanced portfolio performance chart to show both invested amount (dashed line) and current value (solid line)
- Added dual-line visualization for easy comparison of investment vs performance over time
- Expanded realized profit section from 2 to 4 summary cards for comprehensive analytics
- Added "Realized Profit %" calculation showing profit as percentage of invested amount
- Implemented "Annualized IRR" (Internal Rate of Return) calculation for investment performance metrics
- Updated chart tooltips to distinguish between "Invested Amount" and "Current Value"
- Improved dashboard layout with 4-column grid for better data visualization

### Subscription Display Enhancement (July 27, 2025)
- Removed subscription ID display from active subscription section in settings
- Removed "Metered billing enabled" text for cleaner user interface
- Added new API endpoint to fetch payment method details from Stripe subscriptions
- Updated subscription display to show card brand and last 4 digits (e.g., "VISA card ending in 1234")
- Fixed payment method retrieval using subscription-based approach instead of customer-based
- Enhanced user experience with more relevant payment information display

### Comprehensive Dashboard & Payment Integration (July 24, 2025)
- Added tabbed dashboard interface with Portfolio Performance and Realized Profit tabs
- Integrated CryptoBot profit API (/profit) for realized trading profit visualization
- Created comprehensive profit display with summary cards and interactive bar charts
- Shows total realized profit and latest day profit with SGD formatting
- Portfolio tab displays investment value over time with responsive line charts
- Both tabs auto-refresh every 5 minutes with manual refresh capability
- Implemented Stripe payment method integration in settings page
- Users can now add payment methods via Stripe Elements for subscription billing
- Added Stripe setup intent API and payment method storage functionality
- Integrated automated investing toggle with real CryptoBot API state control
- Toggle reflects actual account status: "A" = Active, "I" = Inactive with visual indicators

### Email OTP Verification System (July 25, 2025)
- Implemented secure email OTP verification during sign-up process
- Added `otpCodes` database table for temporary verification code storage
- Created `/api/send-otp` endpoint to generate and send 6-digit verification codes
- Built `/api/verify-otp` endpoint to validate codes and complete user registration
- Integrated nodemailer for email delivery with development console logging fallback
- Added comprehensive two-step sign-up UI with verification code input
- OTP codes expire after 10 minutes for security
- Updated minimum investment validation to S$500 with user-friendly messaging
- Enhanced sign-up flow: Step 1 (user details) → Step 2 (email verification) → Account creation

### Stripe Metered Subscription Implementation (July 25, 2025)
- Implemented Step 1 of metered subscription flow with card-only payments
- Created `/api/create-customer` endpoint to handle Stripe customer creation with payment method
- Built `/api/create-subscription` endpoint for metered subscription using price_1RoRk1AU0aPHWB2SEy3NtXI8
- Added `/api/report-usage` endpoint for metered billing usage tracking
- Setup `/api/setup-payment-method` for secure card payment method collection
- Removed previous payment section from settings page as requested
- All endpoints support only card payments, no alternative payment methods
- Fixed payment method attachment flow: Create → Attach → Set Default
- Added 30-day free trial period to all new subscriptions
- Integrated comprehensive payment & subscription section in settings page with status display

### CryptoBot API Integration (July 23, 2025)
- Updated user registration flow to call external CryptoBot API
- Account creation now validates credentials through https://cryptobot-api-f15f3256ac28.herokuapp.com/signup
- API call includes gemini_api_key, gemini_api_secret, fund amount, and email
- Added required x-api-key header for CryptoBot API authentication
- Integrated API key: L5oQfQ6OAmUQfGhdYsaSEEZqShpJBB2hYQg7nCehH9IzgeEX841EBGkRZp648XDz4Osj6vN0BgXvBRHbi6bqreTviFD7xnnXXV7D2N9nEDWMG25S7x31ve1I2W9pzVhA
- Added comprehensive logging for debugging API requests and responses
- Removed local Gemini API validation in favor of external service validation
- Maintains local user data storage and portfolio initialization after successful external API call

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for development and production builds
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with JSON responses
- **Authentication**: Replit Auth with OpenID Connect integration
- **Session Management**: Express sessions with PostgreSQL storage

### Database Architecture
- **Primary Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle ORM with type-safe queries
- **Connection Pooling**: Neon serverless connection pooling
- **Migrations**: Drizzle Kit for schema migrations

## Key Components

### Authentication System
- **Provider**: Replit Auth using OpenID Connect
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple
- **Authorization**: Route-level protection with middleware
- **User Management**: Automatic user creation on first login

### External API Integrations
- **Gemini Exchange**: Portfolio data fetching and credential validation
- **Stripe Payments**: Subscription management and payment processing
- **Google Gemini AI**: Investment insights and recommendations

### UI Component System
- **Design System**: shadcn/ui with "new-york" style variant
- **Theming**: CSS variables with light/dark mode support
- **Icons**: Lucide React icon library
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints

### Portfolio Management
- **Real-time Data**: Live portfolio tracking via Gemini API
- **Analytics**: Portfolio performance calculations and visualizations
- **Holdings Display**: Detailed cryptocurrency position tracking
- **Refresh Mechanism**: Manual and automatic portfolio data updates

## Data Flow

### User Authentication Flow
1. User accesses protected route
2. Replit Auth middleware validates session
3. User information stored/retrieved from PostgreSQL
4. Frontend receives user data for personalization

### Portfolio Data Flow
1. User provides Gemini API credentials during setup
2. Credentials validated against Gemini API
3. Portfolio data fetched from Gemini exchange
4. Data processed and stored in local database
5. Frontend displays real-time portfolio information

### Payment Processing Flow
1. User initiates subscription via Stripe Elements
2. Payment processed through Stripe API
3. Subscription status stored in user record
4. Access levels updated based on subscription status

## External Dependencies

### Core Runtime Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database ORM
- **express**: Web application framework
- **passport**: Authentication middleware
- **stripe**: Payment processing integration

### Frontend Dependencies
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Headless UI component primitives
- **react-hook-form**: Form state management
- **zod**: Runtime type validation
- **tailwindcss**: Utility-first CSS framework

### Development Dependencies
- **vite**: Frontend build tool and dev server
- **typescript**: Static type checking
- **drizzle-kit**: Database migration tool
- **esbuild**: Server code bundling

## Deployment Strategy

### Development Environment
- **Frontend**: Vite dev server with HMR on client port
- **Backend**: tsx for TypeScript execution with nodemon-like reloading
- **Database**: Neon serverless PostgreSQL instance
- **Environment**: Replit development environment with custom domains

### Production Build Process
1. Frontend built using Vite to `dist/public`
2. Backend bundled using esbuild to `dist/index.js`
3. Static assets served by Express in production
4. Single Node.js process serves both frontend and API

### Environment Configuration
- **DATABASE_URL**: Neon PostgreSQL connection string
- **SESSION_SECRET**: Session encryption key
- **STRIPE_SECRET_KEY**: Stripe API secret
- **VITE_STRIPE_PUBLIC_KEY**: Stripe publishable key
- **REPLIT_DOMAINS**: Allowed authentication domains

### Scaling Considerations
- Serverless database with automatic scaling
- Stateless application design for horizontal scaling
- CDN-ready static asset serving
- Session storage in database for multi-instance support