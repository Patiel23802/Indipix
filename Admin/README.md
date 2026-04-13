# Chitrakal Admin Panel

A web-based admin panel for managing the Chitrakal application.

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Backend server running (see `../backend/README.md`)

### Installation

Install dependencies:
```bash
npm install
```

### Configuration

The admin panel connects to the same backend as the main application. Configure the API URL:

Create a `.env` file in the `Admin` directory:
```bash
VITE_API_URL=http://localhost:3000/api
```

If not set, it defaults to `http://localhost:3000/api`.

### Development

1. **Start the backend server** (in `../backend`):
```bash
cd ../backend
npm run dev
```

2. **Start the admin panel**:
```bash
npm run dev
```

The admin panel will be available at `http://localhost:3001` and will connect to the backend at `http://localhost:3000/api`.

### Build

Build for production:
```bash
npm run build
```

### Preview

Preview the production build:
```bash
npm run preview
```

## Backend Integration

The admin panel uses the same backend API as the main Chitrakal application. All API calls are configured in `src/lib/api.ts`.

### Available API Endpoints

The admin panel can use all existing backend endpoints:
- `GET /api/health` - Health check
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/send-otp` - Send OTP
- `POST /api/auth/verify-otp` - Verify OTP
- `PUT /api/auth/complete-profile` - Complete user profile
- `GET /api/auth/profile/:userId` - Get user profile

### Admin-Specific Endpoints (To be implemented)

The following admin-specific endpoints are planned but need to be added to the backend:
- `GET /api/admin/users` - Get all users
- `GET /api/admin/stats/users` - Get user statistics
- `GET /api/admin/stats/revenue` - Get revenue statistics
- `GET /api/admin/stats/templates` - Get template statistics
- `GET /api/admin/transactions/recent` - Get recent transactions

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **ESLint** - Code linting

