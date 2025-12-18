# Local Development Setup (Step-by-step)

This guide walks you through running the app locally with MongoDB Atlas, Gmail SMTP for OTP, and Cloudinary for image uploads.

## 1) Clone the repository

```bash
git clone <YOUR_REPO_URL>
cd <YOUR_REPO_FOLDER>
```

## 2) Install Node.js (v18+)

- Recommended: Node **18 LTS** or newer.
- Verify:

```bash
node -v
```

## 3) Install dependencies

```bash
npm install
```

## 4) MongoDB Atlas (Free Tier) setup

1. Create an account: https://www.mongodb.com/atlas/database
2. Create a **Free (M0)** cluster.
3. Create a **database user** (Database Access → Add New Database User).
4. Allow your IP address (Network Access → Add IP Address).
   - For local dev you can temporarily allow `0.0.0.0/0`.
5. Get your connection string:
   - Cluster → **Connect** → **Drivers** → copy the `mongodb+srv://...` URI.
6. Replace `<username>`, `<password>`, and choose a database name, for example:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/chat-app?retryWrites=true&w=majority
```

## 5) Gmail SMTP configuration (OTP emails)

The app uses Nodemailer with Gmail.

1. Ensure your Gmail account has **2-Step Verification** enabled.
2. Create a Gmail **App Password**:
   - Google Account → Security → App passwords
3. Set the following environment variables:

```env
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-app-password
```

Notes:
- Use the **app password**, not your normal Gmail password.
- Some corporate/workspace Gmail accounts may restrict app passwords.

## 6) Cloudinary account setup (image uploads)

1. Create a Cloudinary account: https://cloudinary.com/
2. In the dashboard, copy:
   - Cloud name
   - API key
   - API secret
3. Set:

```env
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

## 7) Create your env file

Copy the example file:

```bash
cp .env.example .env.local
```

Then edit `.env.local` and fill in real values.

Generate a strong JWT secret (example):

```bash
openssl rand -base64 32
```

Set it as:

```env
JWT_SECRET=your-generated-secret
```

## 8) Run the application

```bash
npm run dev
```

Open:

- http://localhost:3000

## 9) Basic feature test (manual)

1. Go to `/` and enter an email → **Send OTP**
2. Check your inbox, then verify on `/otp-verify`
3. You should be redirected to `/add-mobile` (first-time users)
4. Add mobile number (optional name + avatar upload)
5. Go to `/chat`:
   - Create a conversation
   - Send messages
   - Upload an image
6. Confirm messages update automatically (polling)

## Optional: Supabase Realtime

The app ships with optional Supabase Realtime helpers. If you want to enable them, add:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

(See `REALTIME_MESSAGING.md` for details.)
