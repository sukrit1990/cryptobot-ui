# CryptoInvest Pro - Cryptocurrency Investment Dashboard

## Overview
CryptoInvest Pro is a full-stack web application designed as a comprehensive cryptocurrency investment platform. It integrates with the Gemini exchange API for real-time portfolio tracking and analytics, and utilizes Stripe for subscription management. The project aims to provide users with detailed insights into their crypto investments, featuring a modern React frontend with shadcn/ui and an Express.js backend with PostgreSQL. The business vision is to empower users with robust tools for managing and understanding their cryptocurrency portfolios, leveraging advanced analytics and seamless financial integrations.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Forms**: React Hook Form with Zod validation
- **UI/UX Decisions**: "new-york" style variant for shadcn/ui, CSS variables for theming with light/dark mode support, Lucide React icon library, and a mobile-first responsive design.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with JSON responses
- **Authentication**: Replit Auth with OpenID Connect integration
- **Session Management**: Express sessions with PostgreSQL storage
- **Security**: Password storage using bcrypt (12 salt rounds), email uniqueness validation, secure email OTP verification for signup.

### Database Architecture
- **Primary Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle ORM
- **Connection Pooling**: Neon serverless connection pooling
- **Migrations**: Drizzle Kit

### Key Components
- **Authentication System**: Replit Auth (OpenID Connect), PostgreSQL-backed sessions, route-level protection, automatic user creation.
- **Portfolio Management**: Real-time data fetching via Gemini API, comprehensive analytics (invested amount vs. current value, realized profit, annualized IRR), detailed holdings display, manual and automatic refresh mechanisms.
- **Subscription & Payment System**: Stripe integration for metered subscriptions and payment processing (card-only payments), customer and subscription creation, monthly billing on the 2nd of each month, payment method management. No trial period - billing starts immediately based on monthly profits.

## External Dependencies

### Core Integrations
- **Gemini Exchange API**: For portfolio data fetching, real-time tracking, and credential validation.
- **Stripe**: For payment processing, subscription management, and metered billing using Meter Events API.
- **CryptoBot API**: External service for user registration validation and realized trading profit visualization.
- **SendGrid**: For reliable email delivery, specifically for OTP verification. Configured with sender email sukrit1990@gmail.com.

### Technical Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity.
- **drizzle-orm**: Type-safe database ORM.
- **express**: Web application framework.
- **passport**: Authentication middleware.
- **stripe**: Stripe API client library.
- **@tanstack/react-query**: Frontend server state management.
- **@radix-ui/**: Headless UI component primitives.
- **react-hook-form**: Form state management.
- **zod**: Runtime type validation.
- **tailwindcss**: Utility-first CSS framework.

## Recent Changes

### Stripe Configuration Updates (August 2, 2025)
- Updated Stripe price ID from price_1RqEaqAU0aPHWB2SC3FlYezV to price_1RrVKkAU0aPHWB2SrdRNnBVm
- Updated Stripe publishable key to live key: pk_live_51RnfLYAU0aPHWB2SOWvibYhS7ByCZ3AD3byWOsgDPEnkUOPeEqCJAkCDOQlarINjK99pRLOabaZaLxvY08hSW9Ju00kUc2razq
- Updated Stripe secret key to live environment key (sk_live_...) for production payment processing
- Verified Stripe integration is fully configured for live production payments
- Confirmed live key deployment - API now accepts real credit cards instead of test cards
- Updated VITE_STRIPE_PUBLIC_KEY environment variable to live publishable key (pk_live_...)
- Verified frontend-backend key consistency for live payment processing
- Maintained metered billing configuration for subscription management

### SendGrid Configuration Update (August 2, 2025)
- Updated sender email address from sukrit.raghuvanshi1990@gmail.com to sukrit1990@gmail.com
- Maintained SENDGRID_API_KEY environment variable for API authentication
- Email service configured for both development (console logging) and production (SendGrid) modes

### Dashboard Chart Enhancements (August 2, 2025)
- Added time period view options (Daily, Weekly, Monthly) to both Portfolio Performance and Realized Profit charts
- Implemented data aggregation functionality to group data by selected time periods
- Fixed date synchronization between "Total Realized Profit" tile and chart with proper chronological sorting
- Enhanced charts with dropdown selectors for dynamic time view switching

### Mobile Responsive Design Optimization (August 2, 2025)
- Completed comprehensive mobile-first responsive design across all pages
- Dashboard: Reduced chart heights (h-48 mobile vs h-80 desktop), optimized grid spacing
- Settings: Compact mobile layouts with single-column forms and responsive grids
- Landing page: Single-column mobile forms, optimized typography and padding
- Checkout: Stacked mobile button layouts, responsive payment forms
- App routing: Removed fixed sidebar for true mobile-first experience
- Typography scaling: text-sm/text-lg mobile vs text-base/text-2xl desktop
- Spacing optimization: gap-3/px-3 mobile vs gap-6/px-6 desktop layouts
- Touch-friendly interfaces optimized for 360px+ screen widths

### Monthly Billing System Implementation (November 12, 2025)
- Replaced daily billing with monthly billing that runs on the 2nd of each month at 2 AM
- Integrated CryptoBot `/account/monthly-fee` API endpoint for retrieving previous month's total profit
- Monthly billing automatically fetches profit data for all subscribed users and reports to Stripe
- Stripe generates invoices and charges customers' payment methods based on monthly profit (converted from dollars to cents)
- Removed daily automated usage reporting in favor of cleaner monthly billing cycle
- Disabled manual meter event creation in `/api/report-usage`, `/api/test-meter-event`, and `/api/test-user-meter-event` endpoints
- All manual endpoints return informational messages explaining automated monthly billing policy
- Meter events are exclusively created through the monthly automated billing job for accuracy
- Enhanced system to prevent accidental duplicate or manual billing events

### Account Management & Logout Functionality (August 2, 2025)
- Implemented complete delete account functionality using CryptoBot API with proper authentication headers
- Added DELETE /api/delete-account endpoint that cancels Stripe subscriptions and destroys user sessions
- Fixed dual logout endpoints: POST /api/signout for dashboard and GET /api/logout for settings
- Both logout methods now properly destroy sessions and redirect users to landing page
- Delete account feature integrates with external CryptoBot API and handles Stripe subscription cleanup

### Gemini API Guide Implementation (August 6, 2025)
- Created comprehensive Gemini API guide page (/gemini-guide) with step-by-step instructions
- Added visual screenshots for account creation and API key generation process
- Integrated guide into pre-login routing - accessible without authentication
- Updated "Learn how to create Gemini API keys" link on sign-up page to point to new guide
- Guide includes mobile-responsive design with proper navigation back to sign-up page

### Admin Portal CryptoBot API Integration (August 9, 2025)
- Enhanced admin user management with full CryptoBot API integration for real-time control
- Updated to use correct CryptoBot API endpoints for proper integration:
  * Gemini credentials: `/account/keys` endpoint with query parameters for email, new_api_key, and new_api_secret
  * Trading control: `/account/state` endpoint for monitoring and controlling trading status
  * User deletion: `/account` endpoint with DELETE method for removing user accounts
  * Fund management: `/account/fund` endpoint with query parameters for email and new_fund amount
- Created user status monitoring with live account state and fund data retrieval from `/account/state` and `/account/fund`
- Integrated user deletion with CryptoBot `/account` DELETE endpoint to maintain data consistency
- Enhanced admin dashboard with status check, fund update, edit, logs, and delete user control buttons
- Replaced account reset functionality with fund update feature using `/account/fund` endpoint
- All admin actions are logged with detailed audit trails including CryptoBot API responses
- Admin portal now provides complete user lifecycle management with proper external API synchronization