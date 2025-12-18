# Next.js OTP Chat App

A lightweight chat application built with **Next.js (App Router)** and **MongoDB** that uses **email OTP** authentication and **JWT sessions**.

- Quick local setup: see **[SETUP.md](./SETUP.md)**
- Production deployment: see **[DEPLOYMENT.md](./DEPLOYMENT.md)**
- Real-time/polling implementation details: **[REALTIME_MESSAGING.md](./REALTIME_MESSAGING.md)**

## Features

- **Email OTP authentication** (Gmail SMTP via Nodemailer)
- **JWT-based sessions** (cookie + client token)
- **Profile completion**: add **mobile number**, optional **name** and **avatar**
- **Conversations**: create and list conversations
- **Messaging**: send/receive messages with **seen** status updates
- **Image uploads** via **Cloudinary**
- **Near real-time updates** via optimized polling (optional Supabase Realtime hooks exist)
- Consistent **API error handling** and client-side **error boundaries/toasts**

## Tech Stack

- **Framework**: Next.js 13 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: MongoDB (Atlas recommended) + Mongoose
- **Email (OTP)**: Nodemailer (Gmail SMTP)
- **Media**: Cloudinary
- **Realtime (optional)**: Supabase Realtime helpers + polling-based hooks

## Local Setup (quick start)

1. Install Node.js **v18+**
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create `.env.local` from `.env.example` and fill in values:

   ```bash
   cp .env.example .env.local
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

5. Open http://localhost:3000

For full step-by-step instructions (MongoDB Atlas + Gmail + Cloudinary), see **[SETUP.md](./SETUP.md)**.

## Environment Variables

Create `.env.local` (recommended) or `.env` in the project root.

### Required

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string (MongoDB Atlas `mongodb+srv://...` recommended) |
| `JWT_SECRET` | Secret used to sign JWTs (use a long random value) |
| `GMAIL_USER` | Gmail address used to send OTP emails |
| `GMAIL_PASS` | Gmail **App Password** (not your normal Gmail password) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `NEXT_PUBLIC_API_URL` | Base URL used by optional realtime helpers (local: `http://localhost:3000`) |

### Optional

| Variable | Description |
|---|---|
| `EMAIL_FROM` | Override the email "from" address (defaults to `GMAIL_USER`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (only if enabling Supabase Realtime features) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |

## Running the App

- Dev: `npm run dev`
- Build: `npm run build`
- Production: `npm run start`

## Troubleshooting

### MongoDB connection errors

- Ensure `MONGODB_URI` is set and correct.
- If using Atlas, ensure:
  - Your IP is allowed under **Network Access** (for local dev you can temporarily allow `0.0.0.0/0`).
  - The database user/password in the connection string is correct.
  - Your cluster is running.

### OTP email not sending

- Gmail requires an **App Password**:
  - Enable **2-Step Verification** in your Google account.
  - Create an **App Password** and use it as `GMAIL_PASS`.
- Check server logs for Nodemailer errors.

### Cloudinary upload fails

- Verify `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
- Confirm the Cloudinary account is active and the credentials are from the same cloud.

### Port already in use

Run Next.js on a different port:

```bash
PORT=3001 npm run dev
```

## Local Testing Checklist

After you have valid `.env.local` values:

1. **Register/Login** with an email (OTP is sent)
2. **Verify OTP** on `/otp-verify`
3. **Add mobile number** (and optional avatar upload)
4. **Create a conversation**
5. **Send/receive messages**
6. **Upload an image** in chat
7. Confirm **real-time-ish updates** (polling refreshes conversations/messages automatically)
