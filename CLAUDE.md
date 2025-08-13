# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a NestJS API for a real estate bidding platform called DeedBid. The application allows users to create property advertisements, place bids, manage wallets, and handle payments through Stripe integration.

## Package Manager

This project uses **Yarn** (version 1.22.22). Always use `yarn` commands instead of `npm`.

## Common Development Commands

### Development
- `yarn start:dev` - Start development server with hot reload
- `yarn start:debug` - Start with debugging enabled
- `yarn start` - Start without hot reload
- `yarn start:prod` - Start production build

### Building and Testing
- `yarn build` - Build the application
- `yarn test` - Run unit tests
- `yarn test:watch` - Run tests in watch mode
- `yarn test:cov` - Run tests with coverage
- `yarn test:e2e` - Run end-to-end tests

### Code Quality
- `yarn lint` - Run ESLint with auto-fix
- `yarn format` - Format code with Prettier

### Database Operations
- `yarn db:push` - Push schema changes to database using Drizzle
- `yarn studio` - Open Drizzle Studio for database management

## Architecture Overview

### Core Technology Stack
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT with Passport
- **Email**: Resend API
- **File Storage**: AWS S3
- **Payments**: Stripe
- **Real-time**: WebSockets (Socket.IO)
- **Scheduling**: NestJS Schedule module

### Module Structure
The application follows NestJS modular architecture with these main modules:

- **Auth Module**: JWT authentication and user validation
- **Users Module**: User management and profiles
- **Adverts Module**: Property advertisement CRUD operations
- **Bids Module**: Bidding system with real-time updates
- **Documents Module**: Document upload and verification
- **Payments Module**: Stripe payment processing
- **Wallets Module**: User wallet and transaction management
- **Email Module**: Email notifications and verification
- **Webhook Module**: External webhook handling (Stripe)
- **Gateways Module**: WebSocket connections for real-time features

### Database Schema
All database schemas are defined in `src/drizzle/schema/` using Drizzle ORM:
- Users, email tokens, documents
- Adverts and bids
- Payments, wallets, wallet operations
- Withdrawal requests

The main schema export is in `src/drizzle/schema/index.ts`.

### Key Patterns
- **Dependency Injection**: Heavy use of NestJS DI container
- **Guards**: JWT authentication guard and role-based access
- **DTOs**: Comprehensive data transfer objects for validation
- **Services**: Business logic separated from controllers
- **Real-time Updates**: WebSocket gateways for bid notifications

## Environment Variables

Required environment variables (defined in `src/main.ts:13-23`):
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Application port
- `JWT_SECRET` - JWT signing secret
- `RESEND_API_KEY` - Email service API key
- `S3_ACCESS_KEY`, `S3_SECRET_ACCESS`, `S3_BUCKET_NAME`, `AWS_REGION` - AWS S3 configuration
- `STRIPE_KEY` - Stripe API key

## Development Notes

### Database Changes
- Use Drizzle Kit for schema management
- Run `yarn db:push` after schema changes
- Use `yarn studio` to inspect database contents

### Testing Strategy
- Unit tests use Jest with `.spec.ts` files
- E2E tests in `/test` directory
- Test configuration in `package.json` jest section

### Real-time Features
- Bidding updates use WebSocket gateways
- Gateway files in `src/gateways/`
- Real-time notifications for outbid scenarios

### File Uploads
- Documents handled through AWS S3
- Upload service integrated with documents module
- Document verification workflow implemented

### Payment Flow
- Stripe integration for bid deposits and payments
- Webhook handling for payment status updates
- Wallet system tracks user balances and operations