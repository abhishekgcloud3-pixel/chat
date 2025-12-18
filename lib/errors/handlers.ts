import { NextRequest, NextResponse } from 'next/server'
import { ApiError } from './ApiError'

/**
 * Error response structure
 */
export interface ErrorResponse {
  success: false
  error: string
  message?: string
  details?: any
  timestamp: string
  path?: string
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: Error | ApiError,
  statusCode: number = 500,
  path?: string
): ErrorResponse {
  const isApiError = error instanceof ApiError
  const message = isApiError ? error.message : 'An unexpected error occurred'
  const details = isApiError ? error.details : undefined

  // Don't expose sensitive information in production
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  return {
    success: false,
    error: message,
    message: isDevelopment ? message : (statusCode >= 500 ? 'Internal server error' : message),
    ...(details && { details: isDevelopment ? details : undefined }),
    timestamp: new Date().toISOString(),
    ...(path && { path }),
  }
}

/**
 * Handle different types of errors and return appropriate responses
 */
export function handleError(
  error: Error | ApiError,
  request?: NextRequest
): NextResponse {
  const path = request?.nextUrl?.pathname
  let statusCode = 500
  let errorResponse: ErrorResponse

  if (error instanceof ApiError) {
    statusCode = error.statusCode
    errorResponse = createErrorResponse(error, statusCode, path)
  } else if (error.name === 'ValidationError') {
    statusCode = 422
    errorResponse = createErrorResponse(error, statusCode, path)
  } else if (error.name === 'CastError') {
    statusCode = 400
    errorResponse = createErrorResponse(
      new Error('Invalid data format'),
      statusCode,
      path
    )
  } else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    statusCode = 500
    errorResponse = createErrorResponse(
      new Error('Database operation failed'),
      statusCode,
      path
    )
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401
    errorResponse = createErrorResponse(
      new Error('Invalid authentication token'),
      statusCode,
      path
    )
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401
    errorResponse = createErrorResponse(
      new Error('Authentication token expired'),
      statusCode,
      path
    )
  } else if (error.name === 'SyntaxError' && 'body' in error) {
    statusCode = 400
    errorResponse = createErrorResponse(
      new Error('Invalid request format'),
      statusCode,
      path
    )
  } else {
    // Generic server error
    errorResponse = createErrorResponse(error, statusCode, path)
  }

  // Log error details
  logError(error, statusCode, path)

  return NextResponse.json(errorResponse, { status: statusCode })
}

/**
 * Log errors to console (can be extended to use external services)
 */
export function logError(error: Error | ApiError, statusCode: number, path?: string) {
  const timestamp = new Date().toISOString()
  const logLevel = statusCode >= 500 ? 'error' : 'warn'
  
  const logData = {
    timestamp,
    level: logLevel,
    statusCode,
    path,
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    ...(error instanceof ApiError && { details: error.details }),
  }

  if (statusCode >= 500) {
    console.error('Server Error:', logData)
  } else {
    console.warn('Client Error:', logData)
  }
}

/**
 * Wrap API route handlers with error handling
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args)
    } catch (error) {
      // Extract request from arguments if available
      const request = args.find(arg => 
        arg && typeof arg === 'object' && 'headers' in arg && 'nextUrl' in arg
      ) as NextRequest | undefined

      throw handleError(error as Error, request)
    }
  }
}

/**
 * Async wrapper to catch errors in route handlers
 */
export function asyncHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return (req: NextRequest, ...rest: T): Promise<R> => {
    return Promise.resolve(fn(req, ...rest)).catch((error) => {
      throw handleError(error, req)
    })
  }
}

/**
 * Format successful responses consistently
 */
export function successResponse<T>(
  data: T,
  message?: string,
  statusCode: number = 200
) {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Format pagination response
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
) {
  return {
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages: pagination.pages,
      hasNext: pagination.page < pagination.pages,
      hasPrev: pagination.page > 1,
    },
    timestamp: new Date().toISOString(),
  }
}