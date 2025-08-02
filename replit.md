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
- **Subscription & Payment System**: Stripe integration for metered subscriptions and payment processing (card-only payments), customer and subscription creation, daily usage reporting for billing, payment method management, and a 30-day free trial.

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

### Meter Events API Access Restriction (July 31, 2025)
- Restricted Stripe meter events API calls to only Daily Automated Usage Reporting (2 AM daily)
- Disabled manual meter event creation in `/api/report-usage`, `/api/test-meter-event`, and `/api/test-user-meter-event` endpoints
- Disabled manual daily usage reporting trigger `/api/report-daily-usage` 
- All manual endpoints now return informational messages explaining automated-only policy
- Meter events are exclusively created through the automated background job for billing accuracy
- Enhanced system to prevent accidental duplicate or manual billing events