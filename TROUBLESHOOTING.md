# Deployment Troubleshooting Guide

This guide helps you resolve common issues when deploying and running the Next.js chat application on Vercel.

## Common Deployment Errors

### Build Failures

#### Error: `npm run build` fails
**Symptoms:**
- Build process stops with errors
- TypeScript compilation errors
- Missing dependencies

**Solutions:**
1. **Check TypeScript errors locally:**
   ```bash
   npm run build
   ```
2. **Verify all dependencies:**
   ```bash
   npm install
   npm audit
   ```
3. **Check for import/export issues:**
   - Ensure all imports use correct paths
   - Verify all exports are properly defined
4. **Fix TypeScript configuration:**
   ```json
   {
     "compilerOptions": {
       "allowJs": true,
       "skipLibCheck": true,
       "strict": false,
       "forceConsistentCasingInFileNames": true,
       "noEmit": true,
       "esModuleInterop": true,
       "module": "esnext",
       "moduleResolution": "node",
       "resolveJsonModule": true,
       "isolatedModules": true,
       "jsx": "preserve",
       "incremental": true
     }
   }
   ```

#### Error: `Module not found`
**Symptoms:**
- Build fails with module import errors
- 500 errors in deployment

**Solutions:**
1. **Check import paths:**
   ```typescript
   // Correct
   import { something } from '@/lib/utils';
   
   // Incorrect  
   import { something } from '../lib/utils';
   ```
2. **Verify file extensions:**
   ```typescript
   // For .ts files in API routes
   import mongoose from 'mongoose';
   ```
3. **Check package.json dependencies:**
   - Ensure all required packages are listed
   - Check version compatibility

### Runtime Errors

#### Error: `500 - Internal Server Error`
**Symptoms:**
- App loads but shows 500 error
- API endpoints return 500 status

**Solutions:**
1. **Check environment variables:**
   ```bash
   # In Vercel dashboard, verify all required variables are set:
   - MONGODB_URI
   - JWT_SECRET
   - GMAIL_USER
   - GMAIL_PASS
   - CLOUDINARY_CLOUD_NAME
   - CLOUDINARY_API_KEY
   - CLOUDINARY_API_SECRET
   - NEXT_PUBLIC_API_URL
   ```

2. **Review function logs in Vercel:**
   - Go to Vercel Dashboard → Functions tab
   - Check error messages in real-time logs

3. **Test database connection locally first:**
   ```javascript
   // Test in local environment
   console.log(process.env.MONGODB_URI);
   mongoose.connect(process.env.MONGODB_URI)
     .then(() => console.log('Connected'))
     .catch(err => console.error('Error:', err));
   ```

#### Error: `Function timeout after 60 seconds`
**Symptoms:**
- API calls timeout
- Long-running operations fail

**Solutions:**
1. **Optimize MongoDB queries:**
   ```javascript
   // Use lean() for read operations
   const users = await User.find().lean();
   
   // Add indexes to frequently queried fields
   db.users.createIndex({ email: 1 });
   db.users.createIndex({ createdAt: -1 });
   ```

2. **Implement connection pooling:**
   ```javascript
   // In lib/mongodb.ts
   const mongoose = require('mongoose');
   
   const connectionOptions = {
     maxPoolSize: 10,
     serverSelectionTimeoutMS: 5000,
     socketTimeoutMS: 45000,
   };
   ```

3. **Use streaming for large operations:**
   ```javascript
   // For large data sets
   const stream = User.find().cursor();
   for await (const doc of stream) {
     // Process documents
   }
   ```

## MongoDB Connection Issues

### Error: `MongoNetworkError`
**Symptoms:**
- Cannot connect to MongoDB Atlas
- Timeout errors
- Authentication failures

**Solutions:**
1. **Check IP Whitelist in MongoDB Atlas:**
   - Go to MongoDB Atlas → Network Access
   - Add IP Address: `0.0.0.0/0` (for Vercel)
   - Or add specific Vercel IP ranges

2. **Verify connection string:**
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<db>?retryWrites=true&w=majority
   ```
   - Ensure username/password are correct
   - Check cluster name matches your Atlas cluster

3. **Test connection locally:**
   ```javascript
   const mongoose = require('mongoose');
   
   mongoose.connect(process.env.MONGODB_URI, {
     useNewUrlParser: true,
     useUnifiedTopology: true,
   })
   .then(() => console.log('MongoDB connected'))
   .catch(err => console.error('Connection error:', err));
   ```

4. **Connection timeout configuration:**
   ```javascript
   const options = {
     serverSelectionTimeoutMS: 10000,
     socketTimeoutMS: 45000,
     maxPoolSize: 10,
   };
   ```

### Error: `Authentication failed`
**Symptoms:**
- MongoDB Atlas authentication errors
- 401/403 status codes

**Solutions:**
1. **Check database user credentials:**
   - Verify username and password in connection string
   - Ensure user has proper permissions

2. **Reset database password:**
   - Go to MongoDB Atlas → Database Access
   - Reset password for your database user

3. **Verify user roles:**
   - Ensure user has `readWrite` role for your database
   - Check IP whitelist settings

## Email Service Issues

### Gmail SMTP Problems

#### Error: `SMTP Error: Authentication failed`
**Symptoms:**
- OTP emails not sending
- 535 error codes

**Solutions:**
1. **Verify Gmail App Password:**
   - Ensure 2FA is enabled on Gmail account
   - Use 16-character app password, not regular password
   - Generate new app password if needed

2. **Check environment variables:**
   ```bash
   GMAIL_USER=your-email@gmail.com
   GMAIL_PASS=your-16-character-app-password
   ```

3. **Test Gmail SMTP configuration:**
   ```javascript
   const nodemailer = require('nodemailer');
   
   const transporter = nodemailer.createTransporter({
     service: 'gmail',
     auth: {
       user: process.env.GMAIL_USER,
       pass: process.env.GMAIL_PASS,
     },
   });
   
   transporter.verify((error, success) => {
     if (error) {
       console.error('SMTP Error:', error);
     } else {
       console.log('SMTP ready');
     }
   });
   ```

#### Error: `SMTP connection timeout`
**Symptoms:**
- Email sending takes too long
- Connection timeout errors

**Solutions:**
1. **Optimize email sending:**
   ```javascript
   const mailOptions = {
     from: process.env.GMAIL_USER,
     to: email,
     subject: 'Your OTP Code',
     text: `Your verification code is: ${otp}`,
     html: `<p>Your verification code is: <strong>${otp}</strong></p>`,
   };
   
   await transporter.sendMail(mailOptions);
   ```

2. **Check network settings:**
   - Ensure Vercel can access Gmail SMTP servers
   - Verify no firewall restrictions

### SendGrid Alternative Setup

If Gmail issues persist, use SendGrid as alternative:

1. **Get SendGrid API Key:**
   - Sign up at sendgrid.com
   - Create API key with mail send permissions

2. **Environment variables:**
   ```bash
   SENDGRID_API_KEY=your-sendgrid-api-key
   SENDGRID_FROM=noreply@yourdomain.com
   ```

3. **SendGrid configuration:**
   ```javascript
   const sgMail = require('@sendgrid/mail');
   sgMail.setApiKey(process.env.SENDGRID_API_KEY);
   
   const msg = {
     to: email,
     from: process.env.SENDGRID_FROM,
     subject: 'Your OTP Code',
     text: `Your verification code is: ${otp}`,
     html: `<p>Your verification code is: <strong>${otp}</strong></p>`,
   };
   
   await sgMail.send(msg);
   ```

## Image Upload Problems

### Cloudinary Connection Issues

#### Error: `Cloudinary upload failed`
**Symptoms:**
- Image uploads return errors
- 500 status on upload endpoints

**Solutions:**
1. **Verify Cloudinary credentials:**
   ```bash
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

2. **Test Cloudinary connection:**
   ```javascript
   const cloudinary = require('cloudinary').v2;
   
   cloudinary.config({
     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
     api_key: process.env.CLOUDINARY_API_KEY,
     api_secret: process.env.CLOUDINARY_API_SECRET,
   });
   
   // Test upload
   const result = await cloudinary.uploader.upload(imagePath);
   console.log(result);
   ```

3. **Check image format and size:**
   - Supported formats: JPEG, PNG, GIF, WebP
   - Max file size: 10MB for free tier
   - Resize large images before upload

#### Error: `CORS errors with images`
**Symptoms:**
- Images don't load in browser
- CORS policy errors

**Solutions:**
1. **Configure Cloudinary CORS:**
   - Go to Cloudinary Settings → Security
   - Add your domain to allowed domains

2. **Update image configuration:**
   ```javascript
   const uploadOptions = {
     folder: 'chat-app',
     resource_type: 'auto',
     allowed_formats: ['jpg', 'png', 'gif', 'webp'],
     transformation: [
       { width: 800, height: 600, crop: 'limit' },
       { quality: 'auto:good' },
     ],
   };
   ```

3. **Check Next.js Image component:**
   ```jsx
   import Image from 'next/image';
   
   <Image
     src={message.imageUrl}
     alt="Uploaded image"
     width={400}
     height={300}
     unoptimized={false}
   />
   ```

## CORS Errors

### Error: `CORS policy blocked`
**Symptoms:**
- API calls fail from frontend
- Network errors in browser console

**Solutions:**
1. **Verify CORS configuration in vercel.json:**
   ```json
   {
     "headers": [
       {
         "source": "/api/(.*)",
         "headers": [
           {
             "key": "Access-Control-Allow-Origin",
             "value": "*"
           },
           {
             "key": "Access-Control-Allow-Methods",
             "value": "GET, POST, PUT, DELETE, OPTIONS"
           }
         ]
       }
     ]
   }
   ```

2. **Add OPTIONS handler in API routes:**
   ```typescript
   export async function OPTIONS(request: Request) {
     return new Response(null, {
       status: 200,
       headers: {
         'Access-Control-Allow-Origin': '*',
         'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
         'Access-Control-Allow-Headers': 'Content-Type, Authorization',
       },
     });
   }
   ```

3. **Check frontend API calls:**
   ```typescript
   const response = await fetch('/api/messages', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${token}`,
     },
     body: JSON.stringify(messageData),
   });
   ```

## Session and Token Issues

### JWT Token Problems

#### Error: `Token invalid/expired`
**Symptoms:**
- Users logged out frequently
- 401 errors on authenticated requests

**Solutions:**
1. **Check JWT secret consistency:**
   ```javascript
   // Ensure same JWT_SECRET in all environments
   const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
   ```

2. **Verify token expiration:**
   ```javascript
   const token = jwt.sign(userData, process.env.JWT_SECRET, {
     expiresIn: '24h',
   });
   ```

3. **Update token handling:**
   ```typescript
   // In middleware
   const token = request.headers.authorization?.replace('Bearer ', '');
   
   if (!token) {
     return NextResponse.json({ error: 'No token provided' }, { status: 401 });
   }
   
   try {
     const decoded = jwt.verify(token, process.env.JWT_SECRET!);
     request.user = decoded;
   } catch (error) {
     return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
   }
   ```

### Authentication Flow Issues

#### Error: `Redirect loops`
**Symptoms:**
- Infinite redirects between pages
- Browser shows "too many redirects"

**Solutions:**
1. **Fix middleware logic:**
   ```typescript
   // middleware.ts
   export function middleware(request: NextRequest) {
     const token = request.cookies.get('auth-token')?.value;
     
     const protectedPaths = ['/chat'];
     const isProtectedPath = protectedPaths.some(path => 
       request.nextUrl.pathname.startsWith(path)
     );
     
     if (isProtectedPath && !token) {
       return NextResponse.redirect(new URL('/', request.url));
     }
     
     return NextResponse.next();
   }
   ```

2. **Check login flow:**
   ```typescript
   // Prevent redirect loops
   const handleLogin = async (email: string, otp: string) => {
     try {
       const response = await fetch('/api/auth/verify-otp', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email, otp }),
       });
       
       if (response.ok) {
         const data = await response.json();
         localStorage.setItem('auth_token', data.token);
         router.push('/chat');
       }
     } catch (error) {
       console.error('Login error:', error);
     }
   };
   ```

## Performance Issues

### Slow Loading Times

#### Solutions:
1. **Optimize database queries:**
   ```javascript
   // Use lean() for read operations
   const messages = await Message.find({ conversationId })
     .populate('sender', 'name email')
     .sort({ createdAt: -1 })
     .limit(50)
     .lean();
   ```

2. **Implement caching:**
   ```javascript
   // Use Redis for caching (if available)
   const cacheKey = `messages:${conversationId}`;
   let messages = await redis.get(cacheKey);
   
   if (!messages) {
     messages = await Message.find({ conversationId }).lean();
     await redis.setex(cacheKey, 300, JSON.stringify(messages));
   }
   ```

3. **Optimize images:**
   ```javascript
   // Upload optimized images to Cloudinary
   const uploadOptions = {
     transformation: [
       { quality: 'auto:good' },
       { fetch_format: 'auto' },
       { width: 800, crop: 'limit' },
     ],
   };
   ```

### Memory Issues

#### Solutions:
1. **Optimize bundle size:**
   ```javascript
   // next.config.ts
   webpack: (config) => {
     config.optimization.splitChunks = {
       chunks: 'all',
     };
     return config;
   }
   ```

2. **Use dynamic imports:**
   ```typescript
   const ChatComponent = dynamic(() => import('./ChatComponent'), {
     loading: () => <Loading />,
     ssr: false,
   });
   ```

## Mobile Responsiveness Issues

### Check responsive design:
1. **Test on mobile devices**
2. **Use responsive breakpoints:**
   ```css
   .chat-container {
     @apply flex flex-col h-screen;
   }
   
   @media (max-width: 768px) {
     .chat-container {
       @apply px-2;
     }
   }
   ```

3. **Optimize touch interactions:**
   ```css
   .message-input {
     @apply p-3 text-base;
     min-height: 44px; /* iOS recommended touch target */
   }
   ```

## Debugging Tools

### Vercel Function Logs
1. Go to Vercel Dashboard → Functions tab
2. Click on any function to see real-time logs
3. Check for error messages and stack traces

### Browser Developer Tools
1. Open browser DevTools (F12)
2. Check Console tab for JavaScript errors
3. Use Network tab to see API request failures
4. Check Application tab for localStorage issues

### MongoDB Compass
1. Connect to your MongoDB Atlas cluster
2. Verify data integrity
3. Check query performance

### Environment Variable Testing
```javascript
// Add to any API route for testing
export async function GET() {
  return Response.json({
    environment: process.env.NODE_ENV,
    hasMongoDB: !!process.env.MONGODB_URI,
    hasJWT: !!process.env.JWT_SECRET,
    hasGmail: !!process.env.GMAIL_USER,
    hasCloudinary: !!process.env.CLOUDINARY_CLOUD_NAME,
  });
}
```

## Getting Help

### Log Collection
When reporting issues, include:
1. Vercel function logs
2. Browser console errors
3. Network request failures
4. Environment variable status
5. Steps to reproduce the issue

### Common Log Patterns
```
✅ Success: Function executed successfully
⚠️ Warning: Non-critical issues
❌ Error: Critical failures requiring immediate attention
📝 Info: Informational messages
```

### Emergency Fallbacks
If critical issues occur:
1. **Revert to previous deployment**
2. **Enable maintenance mode**
3. **Check backup data**
4. **Monitor error rates**

---

For additional support, check:
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Atlas Support](https://support.mongodb.com)
- [Cloudinary Support](https://support.cloudinary.com)