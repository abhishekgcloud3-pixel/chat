import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from './connection'
import mongoose from 'mongoose'

/**
 * Middleware to ensure database connection for API routes
 */
export async function dbMiddleware(
  req: NextRequest,
  next: () => Promise<void> | void
): Promise<void> {
  try {
    // Ensure database connection is established
    await connectDB()
    console.log(`Database connection established for ${req.method} ${req.nextUrl.pathname}`)
  } catch (error) {
    console.error('Database connection failed in middleware:', error)
    throw error // Re-throw to be caught by error handler
  }
}

/**
 * Higher-order function to wrap API route handlers with database middleware
 */
export function withDB(
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      // Ensure database connection
      await connectDB()
      
      // Call the actual handler
      return await handler(req, ...args)
    } catch (error) {
      console.error(`Database error in API route ${req.nextUrl.pathname}:`, error)
      
      // Check if it's a connection error
      if (error instanceof mongoose.Error.MongooseServerSelectionError) {
        return NextResponse.json(
          { 
            error: 'Database connection failed', 
            message: 'Unable to connect to database server' 
          },
          { status: 503 } // Service Unavailable
        )
      }
      
      // Check if it's a validation or other Mongoose error
      if (error instanceof mongoose.Error.ValidationError) {
        return NextResponse.json(
          { 
            error: 'Database validation error', 
            message: error.message 
          },
          { status: 400 }
        )
      }
      
      // Generic database error
      return NextResponse.json(
        { 
          error: 'Database error', 
          message: 'An unexpected database error occurred' 
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Middleware function for GET requests with DB connection
 */
export function withDBGET(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return withDB(async (req: NextRequest) => {
    if (req.method !== 'GET') {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
    }
    return handler(req)
  })
}

/**
 * Middleware function for POST requests with DB connection
 */
export function withDBPOST(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return withDB(async (req: NextRequest) => {
    if (req.method !== 'POST') {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
    }
    return handler(req)
  })
}

/**
 * Middleware function for PUT requests with DB connection
 */
export function withDBPUT(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return withDB(async (req: NextRequest) => {
    if (req.method !== 'PUT') {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
    }
    return handler(req)
  })
}

/**
 * Middleware function for DELETE requests with DB connection
 */
export function withDBDELETE(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return withDB(async (req: NextRequest) => {
    if (req.method !== 'DELETE') {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
    }
    return handler(req)
  })
}

/**
 * Error handler for database connection failures
 */
export function handleDBError(error: any, req: NextRequest): NextResponse {
  console.error(`Database error in ${req.method} ${req.nextUrl.pathname}:`, error)

  // Handle specific MongoDB connection errors
  if (error.name === 'MongoNetworkError' || error.name === 'MongooseServerSelectionError') {
    return NextResponse.json(
      {
        error: 'Database connection failed',
        message: 'Unable to connect to the database server. Please try again later.',
        code: 'DB_CONNECTION_ERROR',
      },
      { status: 503 }
    )
  }

  // Handle MongoDB authentication errors
  if (error.name === 'MongoAuthenticationError') {
    return NextResponse.json(
      {
        error: 'Database authentication failed',
        message: 'Database authentication credentials are invalid.',
        code: 'DB_AUTH_ERROR',
      },
      { status: 401 }
    )
  }

  // Handle MongoDB timeout errors
  if (error.name === 'MongoTimeoutError') {
    return NextResponse.json(
      {
        error: 'Database timeout',
        message: 'Database operation timed out. Please try again.',
        code: 'DB_TIMEOUT_ERROR',
      },
      { status: 408 }
    )
  }

  // Handle Mongoose validation errors
  if (error.name === 'ValidationError') {
    return NextResponse.json(
      {
        error: 'Validation error',
        message: error.message,
        code: 'VALIDATION_ERROR',
      },
      { status: 400 }
    )
  }

  // Handle Mongoose duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0]
    return NextResponse.json(
      {
        error: 'Duplicate entry',
        message: `${field} already exists`,
        code: 'DUPLICATE_ERROR',
      },
      { status: 409 }
    )
  }

  // Handle general Mongoose errors
  if (error.name === 'MongooseError') {
    return NextResponse.json(
      {
        error: 'Database error',
        message: error.message,
        code: 'MONGOOSE_ERROR',
      },
      { status: 500 }
    )
  }

  // Generic error handler
  return NextResponse.json(
    {
      error: 'Internal server error',
      message: 'An unexpected error occurred while processing your request.',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  )
}

/**
 * Check database connection status
 */
export async function checkDBConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    await connectDB()
    return { connected: true }
  } catch (error: any) {
    return { 
      connected: false, 
      error: error.message || 'Unknown database connection error' 
    }
  }
}

/**
 * Health check endpoint helper
 */
export async function getDBHealthStatus() {
  try {
    await connectDB()
    const state = mongoose.connection.readyState
    
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    }

    return {
      status: state === 1 ? 'healthy' : 'unhealthy',
      database: {
        state: states[state as keyof typeof states] || 'unknown',
        readyState: state,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name,
      }
    }
  } catch (error: any) {
    return {
      status: 'unhealthy',
      error: error.message,
      database: {
        state: 'error',
        error: error.message,
      }
    }
  }
}