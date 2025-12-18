# Deployment Guide (Vercel)

This app is designed to deploy cleanly to **Vercel**.

## 1) Prepare the repo

- Push the repository to GitHub/GitLab/Bitbucket.
- Ensure `npm run build` succeeds locally.

## 2) Create a Vercel project

1. Go to https://vercel.com/new
2. Import your repository
3. Framework preset: **Next.js**
4. Build command: `npm run build`
5. Output: handled automatically by Vercel

## 3) Configure Environment Variables in Vercel

In Vercel:

- Project → **Settings** → **Environment Variables**

Add the same variables you use locally (Production + Preview as needed):

### Required

- `MONGODB_URI`
- `JWT_SECRET`
- `GMAIL_USER`
- `GMAIL_PASS`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `NEXT_PUBLIC_API_URL` (set to your deployed URL, e.g. `https://your-app.vercel.app`)

### Optional

- `EMAIL_FROM`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

After adding variables, redeploy.

## 4) MongoDB Atlas connection for production

- Use the same Atlas cluster or a dedicated production cluster.
- **Network Access** must allow Vercel to connect.
  - Simplest (less restrictive): allow `0.0.0.0/0`.
  - More secure: restrict to known IPs where possible (Vercel uses dynamic IPs in many cases).

## 5) Email service setup (Gmail)

- For OTP delivery in production:
  - Use a Gmail App Password.
  - Watch out for Gmail sending limits.

For production-grade email deliverability, consider switching to a transactional provider (SendGrid, Postmark, SES). The current implementation targets Gmail for simplicity.

## 6) Cloudinary setup

- Ensure the Cloudinary credentials are present in Vercel env vars.
- The Next.js image config already allows `res.cloudinary.com`.

## 7) Post-deploy verification

- Open your deployed URL.
- Verify `/api/health` responds with `{ status: "ok" }`.
- Run through the authentication flow:
  - Login → OTP verify → Add mobile → Chat
- Test:
  - Conversation creation
  - Message send/receive
  - Image upload
  - Message seen status updates

## Common deployment issues

### Build fails due to missing env vars

Ensure all required environment variables are set in Vercel and redeploy.

### MongoDB connection timeout

- Check Atlas Network Access.
- Double-check the username/password in `MONGODB_URI`.
