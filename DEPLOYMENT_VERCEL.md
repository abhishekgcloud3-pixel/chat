# Vercel Deployment Guide

This guide will help you deploy your Next.js chat application to Vercel with full serverless functionality.

## Prerequisites

### Required Accounts
1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository** - Code should be in a GitHub repo
3. **MongoDB Atlas** - Cloud database service
4. **Gmail Account** - For OTP email sending (or SendGrid alternative)
5. **Cloudinary Account** - For image storage and optimization

### Local Setup
Ensure your application runs successfully locally before deploying:

```bash
npm run dev
```

## Step 1: Prepare Your GitHub Repository

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push origin main
   ```

2. **Ensure .env.example is included** (already done)

## Step 2: Connect GitHub to Vercel

### Option A: Via Vercel Dashboard
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure project settings

### Option B: Via GitHub Marketplace
1. Visit [Vercel GitHub App](https://github.com/marketplace/vercel)
2. Click "Install" and authorize Vercel
3. Select repositories to deploy

## Step 3: Configure Vercel Project Settings

### Basic Settings
- **Framework Preset**: Next.js
- **Root Directory**: Leave as `./` (root)
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install` (auto-detected)

### Advanced Settings
- **Node.js Version**: 18.x or higher
- **Region**: Choose closest to your users

## Step 4: Environment Variables

Add these environment variables in your Vercel project settings:

### Required Variables

#### Database
```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<db>?retryWrites=true&w=majority
```

#### Authentication
```
JWT_SECRET=your-secure-jwt-secret-key-here
```

#### Email Service (Gmail)
```
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-16-character-app-password
```

#### Cloudinary (Image Storage)
```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

#### Public Configuration
```
NEXT_PUBLIC_API_URL=https://your-app.vercel.app
```

### Optional Variables
```
EMAIL_FROM=your-email@gmail.com
```

### Adding Environment Variables in Vercel

1. Go to your project dashboard
2. Navigate to **Settings > Environment Variables**
3. Add each variable:
   - **Name**: Exact variable name (e.g., `MONGODB_URI`)
   - **Value**: Your actual value
   - **Environment**: Select all (Production, Preview, Development)

## Step 5: Deploy Steps

1. **Automatic Deployment**:
   - Vercel auto-deploys on every push to connected branches
   - Main branch → Production deployment
   - Other branches → Preview deployments

2. **Manual Deployment**:
   - Go to **Deployments** tab
   - Click **Redeploy** on any deployment
   - Or push to trigger new deployment

3. **Production Deployment**:
   - Only triggered from main branch
   - Requires successful preview deployment first

## Step 6: Testing Deployment

### 1. Initial Health Check
Visit your deployed URL and verify:
- [ ] Homepage loads without errors
- [ ] No 500 errors in browser console
- [ ] Basic styling appears correctly

### 2. Authentication Flow
- [ ] Navigate to OTP verification page
- [ ] Enter email and request OTP
- [ ] Check email for OTP code
- [ ] Verify OTP and login successfully

### 3. Core Functionality
- [ ] Create new conversation
- [ ] Send messages
- [ ] Upload and send images
- [ ] Real-time message updates

### 4. Error Handling
- [ ] Test with invalid OTP
- [ ] Test with network errors
- [ ] Verify error messages are user-friendly

## Step 7: MongoDB Atlas Configuration

### IP Whitelist Setup
1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Select your cluster
3. Navigate to **Network Access**
4. Add IP Address:
   - **IP Address**: `0.0.0.0/0` (allows all IPs)
   - **Description**: "Vercel deployment"
5. Click **Confirm**

### Connection String
Ensure your MONGODB_URI follows this format:
```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<db>?retryWrites=true&w=majority
```

### Connection Testing
Test connection in MongoDB Compass or similar tool before deploying.

## Step 8: Gmail App Password Setup

### Enable 2-Factor Authentication
1. Go to [Google Account Settings](https://myaccount.google.com)
2. Navigate to **Security**
3. Enable **2-Step Verification**

### Generate App Password
1. In **Security** section, find **App passwords**
2. Select **Mail** and **Other (Custom name)**
3. Enter name: "Vercel Chat App"
4. Copy the 16-character password
5. Use this as `GMAIL_PASS` value

### Important Notes
- Use app password, not your regular Gmail password
- Keep this password secure
- Some Google accounts may restrict app passwords

## Step 9: Cloudinary Setup

### Create Cloudinary Account
1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Get your cloud credentials from dashboard

### Environment Variables
- **CLOUDINARY_CLOUD_NAME**: Your cloud name
- **CLOUDINARY_API_KEY**: Your API key
- **CLOUDINARY_API_SECRET**: Your API secret

## Step 10: Production URL Configuration

After deployment, update your environment variables:

1. **Vercel Project Settings** → Environment Variables
2. Update `NEXT_PUBLIC_API_URL` to your actual Vercel URL:
   ```
   NEXT_PUBLIC_API_URL=https://your-app-name.vercel.app
   ```

## Step 11: Domain Configuration (Optional)

### Custom Domain
1. Go to **Settings > Domains**
2. Add your custom domain
3. Configure DNS records as instructed
4. Update `NEXT_PUBLIC_API_URL` if using custom domain

## Step 12: Monitoring and Logs

### Vercel Function Logs
1. Go to **Functions** tab in Vercel dashboard
2. View real-time logs for debugging
3. Check for deployment errors

### Error Tracking
- Monitor 404/500 errors in browser console
- Check network tab for failed API requests
- Verify MongoDB connection errors

## Step 13: Performance Optimization

### Build Optimization
- Vercel automatically optimizes Next.js builds
- Enable compression and caching
- Monitor bundle size in Vercel analytics

### Image Optimization
- Cloudinary handles image optimization automatically
- Next.js Image component optimizes images
- Consider WebP format for better performance

## Step 14: Security Checklist

### Environment Variables
- [ ] All secrets are in environment variables
- [ ] No sensitive data in code
- [ ] JWT_SECRET is sufficiently complex

### Database Security
- [ ] MongoDB Atlas has IP whitelist configured
- [ ] Connection uses authentication
- [ ] Database has proper indexes

### API Security
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Input validation in place

## Troubleshooting Common Issues

### Build Failures
- Check `npm run build` works locally first
- Verify all dependencies are in package.json
- Check for TypeScript errors

### Runtime Errors
- Review Vercel function logs
- Check environment variables are set
- Verify MongoDB connection string

### Email Not Sending
- Verify Gmail app password is correct
- Check 2FA is enabled on Gmail account
- Review email sending logs

### Image Upload Issues
- Verify Cloudinary credentials
- Check image size limits
- Review CORS settings

## Post-Deployment Checklist

- [ ] Application loads without errors
- [ ] User registration/login works
- [ ] OTP emails are received
- [ ] Messaging functionality works
- [ ] Image uploads succeed
- [ ] Real-time updates work
- [ ] Mobile responsive design works
- [ ] Error handling works properly
- [ ] Performance is acceptable
- [ ] No console errors in production

## Support and Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com)
- [Gmail App Passwords Help](https://support.google.com/accounts/answer/185833)
- [Cloudinary Documentation](https://cloudinary.com/documentation)

## Next Steps

After successful deployment:
1. Set up monitoring and alerts
2. Configure custom domain (optional)
3. Implement backup strategies
4. Set up CI/CD pipeline for future updates
5. Consider performance monitoring tools

---

**Need Help?** Check our [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.