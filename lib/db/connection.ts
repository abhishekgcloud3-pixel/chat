import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || ''

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local')
}

// Global connection cache for serverless environments
interface GlobalMongoose {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  var mongoose: GlobalMongoose | undefined
}

let cached = global.mongoose || { conn: null, promise: null }

if (!global.mongoose) {
  global.mongoose = cached
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    console.log('MongoDB connection already established')
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10, // Connection pooling for serverless
      serverSelectionTimeoutMS: 5000, // 5 seconds
      socketTimeoutMS: 45000, // 45 seconds
      family: 4, // Force IPv4
    }

    console.log('Connecting to MongoDB...')
    
    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('MongoDB connection established successfully')
        return mongoose
      })
      .catch((error) => {
        console.error('MongoDB connection error:', error)
        throw error
      })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    console.error('Failed to connect to MongoDB:', e)
    throw e
  }

  return cached.conn
}

// Graceful disconnect for serverless environments
export async function disconnectDB(): Promise<void> {
  if (cached.conn) {
    await cached.conn.disconnect()
    cached.conn = null
    cached.promise = null
    console.log('MongoDB connection closed')
  }
}