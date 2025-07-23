# CryptoInvest Pro - Cryptocurrency Investment Dashboard

## Overview

CryptoInvest Pro is a full-stack web application that provides users with a comprehensive cryptocurrency investment platform. The application integrates with Gemini exchange API to track portfolio performance, supports Stripe payments for subscription management, and offers real-time portfolio analytics. Built with modern web technologies, it features a React frontend with shadcn/ui components and an Express.js backend with PostgreSQL database storage.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### Portfolio Visualization & Account Control Integration (July 23, 2025)
- Integrated CryptoBot history API for real-time portfolio data visualization
- Added responsive line chart using Recharts library showing portfolio performance over time
- Implemented account state API integration for automated investing toggle control
- Toggle now reflects real account status: "A" = Active, "I" = Inactive
- Added POST API integration to toggle automation state with immediate UI feedback
- Included visual status indicators with colored dots and loading states
- Real-time data refresh every 5 minutes with manual refresh capability
- Portfolio metrics calculated from actual API data with SGD formatting

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