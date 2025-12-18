# MongoDB Atlas Setup Guide for Vercel Deployment

This guide provides step-by-step instructions for configuring MongoDB Atlas for optimal performance in a Vercel serverless environment.

## Prerequisites

- MongoDB Atlas account (free tier available)
- Vercel account
- Next.js application ready for deployment

## Step 1: Create MongoDB Atlas Cluster

### 1.1 Sign Up and Create Cluster
1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Sign up for a free account
3. Click "Create a New Cluster"
4. Choose:
   - **Cloud Provider & Region**: Select region closest to your Vercel deployment (e.g., `us-east-1` for AWS)
   - **Cluster Tier**: M0 (Free) or M10+ for production
   - **Cluster Name**: `chat-app-cluster` (or your preferred name)
5. Click "Create Cluster"

### 1.2 Database User Setup
1. Go to **Database Access** in the left sidebar
2. Click **Add New Database User**
3. Choose **Password** authentication method
4. Create username and password (save these credentials)
5. Grant **Atlas admin** role (for development) or **readWrite** role (for production)
6. Click **Add User**

## Step 2: Network Access Configuration

### 2.1 Configure IP Whitelist for Vercel
1. Go to **Network Access** in the left sidebar
2. Click **Add IP Address**
3. Choose **Allow access from anywhere** (0.0.0.0/0)
   - **Note**: This is required for Vercel serverless functions as IP addresses are dynamic
4. Add description: "Vercel deployment - chat application"
5. Click **Confirm**

### 2.2 Alternative: Specific Vercel IP Ranges
If you want to restrict to Vercel IPs only:
1. Note down Vercel's IP ranges for your region
2. Add each IP range separately in Network Access
3. This is more secure but may require updates if Vercel changes their ranges

## Step 3: Get Connection String

### 3.1 Create Database
1. Go to your cluster dashboard
2. Click **Create Database**
3. Database name: `chat_app_db`
4. Collection name: `users` (or leave blank for now)

### 3.2 Get Connection String
1. Click **Connect** on your cluster
2. Choose **Connect your application**
3. Select **Node.js** and version **3.6 or later**
4. Copy the connection string - it will look like:
   ```
   mongodb+srv://<username>:<password>@cluster0.mongodb.net/chat_app_db?retryWrites=true&w=majority
   ```

### 3.3 Replace Placeholders
Replace `<username>` and `<password>` with your database user credentials:
```
mongodb+srv://your_username:your_password@cluster0.mongodb.net/chat_app_db?retryWrites=true&w=majority
```

## Step 4: Optimize Connection for Vercel

### 4.1 Add Connection Options
Update your connection string with serverless-optimized settings:
```
mongodb+srv://your_username:your_password@cluster0.mongodb.net/chat_app_db?retryWrites=true&w=majority&serverSelectionTimeoutMS=5000&socketTimeoutMS=45000&maxPoolSize=10&minPoolSize=2&maxIdleTimeMS=30000&waitQueueMultiple=5&waitQueueTimeoutMS=50
```

### 4.2 Connection String Parameters Explained
- `retryWrites=true`: Enables retryable writes
- `w=majority`: Write concern for data durability
- `serverSelectionTimeoutMS=5000`: How long to try connecting to a server
- `socketTimeoutMS=45000`: How long to wait for socket communication
- `maxPoolSize=10`: Maximum connections in pool
- `minPoolSize=2`: Minimum connections in pool
- `maxIdleTimeMS=30000`: How long to keep idle connections
- `waitQueueMultiple=5`: Multiplier for connection queuing
- `waitQueueTimeoutMS=50`: How long to wait for a connection from queue

## Step 5: Environment Variable Configuration

### 5.1 Add to Vercel Environment Variables
In your Vercel project dashboard:
1. Go to **Settings > Environment Variables**
2. Add the following variable:
   ```
   Name: MONGODB_URI
   Value: mongodb+srv://your_username:your_password@cluster0.mongodb.net/chat_app_db?retryWrites=true&w=majority&serverSelectionTimeoutMS=5000&socketTimeoutMS=45000&maxPoolSize=10&minPoolSize=2&maxIdleTimeMS=30000&waitQueueMultiple=5&waitQueueTimeoutMS=50
   Environment: Production, Preview, Development
   ```

### 5.2 Update .env.local Template
Update your `.env.example` with the optimized connection string:
```bash
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<db>?retryWrites=true&w=majority&serverSelectionTimeoutMS=5000&socketTimeoutMS=45000&maxPoolSize=10&minPoolSize=2&maxIdleTimeMS=30000&waitQueueMultiple=5&waitQueueTimeoutMS=50
```

## Step 6: Database Schema and Indexes

### 6.1 Create Required Indexes
Run these commands in MongoDB Atlas MongoSH or Compass:

```javascript
// Users collection indexes
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "mobileNumber": 1 }, { sparse: true })
db.users.createIndex({ "createdAt": -1 })

// Conversations collection indexes
db.conversations.createIndex({ "participants.userId": 1 })
db.conversations.createIndex({ "lastMessageAt": -1 })
db.conversations.createIndex({ "createdAt": -1 })

// Messages collection indexes
db.messages.createIndex({ "conversationId": 1, "createdAt": -1 })
db.messages.createIndex({ "senderId": 1 })
db.messages.createIndex({ "createdAt": -1 })

// OTP collection indexes (if using separate collection)
db.otps.createIndex({ "email": 1, "createdAt": 1 }, { expireAfterSeconds: 600 })
```

### 6.2 Create Database Collections
Create the following collections in your database:
- `users` - User profiles and authentication
- `conversations` - Chat conversations
- `messages` - Individual messages
- `otps` - OTP verification codes (optional, can be embedded)

## Step 7: Connection Pool Configuration

### 7.1 Serverless-Optimized Connection
Create or update your database connection file:

```typescript
// lib/db/connection.ts
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      retryReads: true,
      writeConcern: {
        w: 'majority',
        j: true,
        wtimeout: 5000
      }
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('✅ Connected to MongoDB Atlas');
      return mongoose;
    }).catch((error) => {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

// Graceful shutdown
export async function disconnectDB(): Promise<void> {
  if (cached.conn) {
    await cached.conn.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log('📤 Disconnected from MongoDB Atlas');
  }
}
```

### 7.2 Health Check Endpoint
Add a database health check endpoint:

```typescript
// app/api/health/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      database: 'disconnected',
      error: 'Database connection failed',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}
```

## Step 8: Performance Optimization

### 8.1 Query Optimization
Optimize your queries for serverless environment:

```typescript
// Example: Optimized message fetching
export async function getMessages(conversationId: string, limit = 50) {
  const messages = await Message.find({ conversationId })
    .populate('sender', 'name email avatar')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean() // Important: use lean() for read-only queries
    .exec();
  
  return messages.reverse(); // Return in chronological order
}

// Example: Optimized user lookup
export async function findUserByEmail(email: string) {
  return await User.findOne({ email })
    .select('-password') // Exclude sensitive fields
    .lean()
    .exec();
}
```

### 8.2 Aggregation Pipeline Optimization
Use efficient aggregation pipelines:

```typescript
// Efficient conversation listing
export async function getUserConversations(userId: string) {
  return await Conversation.aggregate([
    { $match: { 'participants.userId': userId } },
    {
      $lookup: {
        from: 'messages',
        localField: '_id',
        foreignField: 'conversationId',
        as: 'lastMessage'
      }
    },
    {
      $addFields: {
        lastMessage: { $arrayElemAt: ['$lastMessage', -1] }
      }
    },
    { $sort: { lastMessageAt: -1 } },
    { $limit: 20 }
  ]).lean().exec();
}
```

## Step 9: Monitoring and Alerts

### 9.1 Enable Atlas Monitoring
1. Go to your cluster in Atlas
2. Click **Monitor** tab
3. Enable monitoring for:
   - Database operations
   - Connection metrics
   - Query performance
   - Memory usage

### 9.2 Set Up Alerts
1. Go to **Alerts** tab
2. Create alerts for:
   - High connection count (>80% of pool size)
   - Slow queries (>100ms average)
   - Database errors
   - Connection failures

### 9.3 Performance Advisor
1. Use Atlas Performance Advisor to identify slow queries
2. Review suggested indexes
3. Monitor query performance over time

## Step 10: Backup Strategy

### 10.1 Enable Cloud Backups
1. Go to your cluster settings
2. Enable **Cloud Backups**
3. Configure backup schedule (daily recommended for production)
4. Set retention period (7 days for free tier)

### 10.2 Point-in-Time Recovery (Production)
For production environments, enable:
1. **Continuous Backup** (requires M10+ tier)
2. **Point-in-time Recovery**
3. Set retention based on business requirements

## Step 11: Security Best Practices

### 11.1 Database-Level Security
- Use strong passwords for database users
- Enable authentication on all connections
- Use SSL/TLS for all connections (enabled by default)
- Regularly rotate database user passwords

### 11.2 Application-Level Security
- Never log connection strings
- Use environment variables for all secrets
- Validate and sanitize all user inputs
- Implement proper error handling

### 11.3 Network Security
- Consider IP whitelisting for production
- Use VPC peering for additional security
- Enable audit logging for compliance

## Step 12: Testing and Validation

### 12.1 Connection Test
Test your connection string:

```javascript
// Test script (run locally)
const { MongoClient } = require('mongodb');

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
  });

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = client.db();
    const collections = await db.listCollections().toArray();
    console.log('📊 Collections:', collections.map(c => c.name));
    
  } catch (error) {
    console.error('❌ Connection failed:', error);
  } finally {
    await client.close();
  }
}

testConnection();
```

### 12.2 Production Readiness Checklist
- [ ] Connection string uses proper credentials
- [ ] IP whitelist includes Vercel (0.0.0.0/0)
- [ ] All required indexes are created
- [ ] Environment variables are configured in Vercel
- [ ] Health check endpoint returns success
- [ ] Monitoring and alerts are enabled
- [ ] Backups are configured and tested

## Troubleshooting Common Issues

### Connection Timeouts
**Problem**: Function times out connecting to MongoDB
**Solution**: 
- Reduce `serverSelectionTimeoutMS` to 5000ms
- Ensure IP whitelist includes Vercel IPs
- Check cluster is not paused (free tier)

### Authentication Failures
**Problem**: "Authentication failed" errors
**Solution**:
- Verify username/password in connection string
- Check user has proper permissions
- Ensure special characters are URL-encoded

### High Latency
**Problem**: Slow database operations
**Solution**:
- Choose region closest to Vercel deployment
- Optimize queries with proper indexes
- Use `lean()` for read-only operations
- Consider upgrading cluster tier

### Connection Pool Exhaustion
**Problem**: "Connection pool exhausted" errors
**Solution**:
- Monitor connection usage in Atlas
- Optimize connection reuse in code
- Adjust pool size settings
- Implement connection pooling properly

## Next Steps

1. **Monitor Performance**: Use Atlas monitoring to track query performance
2. **Optimize Based on Usage**: Adjust connection pool settings based on actual usage patterns
3. **Scale as Needed**: Upgrade cluster tier when approaching limits
4. **Regular Maintenance**: Review and optimize queries regularly
5. **Security Audits**: Conduct regular security reviews

## Support Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [MongoDB Node.js Driver Documentation](https://docs.mongodb.com/drivers/node/)
- [MongoDB Connection String Documentation](https://docs.mongodb.com/manual/reference/connection-string/)
- [Atlas Community Forums](https://developer.mongodb.com/community/forums/atlas-community/)

---

This setup ensures optimal performance and reliability for your chat application on Vercel with MongoDB Atlas.
