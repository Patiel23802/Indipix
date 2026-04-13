# Chitrakal Backend API

Express.js backend API server for Chitrakal mobile app, connecting to PostgreSQL database.

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and update with your PostgreSQL credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chitrakal
DB_USER=postgres
DB_PASSWORD=your_password_here
PORT=3000
```

### 3. Start the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will run on `http://localhost:3000`

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Register new user
  - Body: `{ phone: string, password: string }`
  
- `POST /api/auth/login` - Login user
  - Body: `{ phone: string, password: string }`

- `POST /api/auth/send-otp` - Send OTP to phone
  - Body: `{ phone: string }`

- `POST /api/auth/verify-otp` - Verify OTP
  - Body: `{ phone: string, otp: string }`

- `PUT /api/auth/complete-profile` - Complete user profile
  - Body: `{ userId: string, first_name, last_name, ... }`

- `GET /api/auth/profile/:userId` - Get user profile

### Health Check

- `GET /api/health` - Check server status

## Testing OTPs

For testing purposes, these phone numbers have hardcoded 6-digit OTPs:
- `9876543210` → OTP: `123456`
- `9876543211` → OTP: `567890`
- `9876543212` → OTP: `999999`
- Any other phone number → OTP: `000000` (default)

## Notes

- Make sure PostgreSQL database is set up and running
- The database schema should be created using `database/schema.sql`
- For production, implement password hashing (bcrypt is included but not used yet)
- CORS is enabled for all origins (restrict in production)

