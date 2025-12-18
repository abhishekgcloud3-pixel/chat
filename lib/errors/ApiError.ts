/**
 * Custom API Error class for consistent error handling
 */
export class ApiError extends Error {
  public statusCode: number
  public isOperational: boolean
  public details?: any

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.details = details

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError)
    }
  }
}

/**
 * HTTP Status Codes for common error scenarios
 */
export const HttpStatus = {
  // 2xx Success
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,

  // 4xx Client Error
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  TOO_MANY_REQUESTS: 429,

  // 5xx Server Error
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const

/**
 * Create specific error types
 */
export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, HttpStatus.VALIDATION_ERROR, true, details)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super(message, HttpStatus.UNAUTHORIZED, true)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = 'Access denied') {
    super(message, HttpStatus.FORBIDDEN, true)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(message, HttpStatus.NOT_FOUND, true)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Resource conflict') {
    super(message, HttpStatus.CONFLICT, true)
    this.name = 'ConflictError'
  }
}

export class ServerError extends ApiError {
  constructor(message: string = 'Internal server error') {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, true)
    this.name = 'ServerError'
  }
}