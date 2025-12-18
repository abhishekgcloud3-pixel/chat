import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connection'
import { testEmailService } from '@/lib/email/otp'

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  environment: string
  services: {
    server: 'up'
    database: 'connected' | 'disconnected' | 'error'
    email: 'configured' | 'not_configured' | 'error'
  }
  version: string
  uptime: number
  memory: {
    used: string
    total: string
    percentage: number
  }
  checks: {
    [key: string]: {
      status: 'pass' | 'fail' | 'warning'
      message: string
      duration?: number
    }
  }
}

export async function GET() {
  const startTime = Date.now()
  const checks: HealthCheckResult['checks'] = {}
  
  try {
    // Basic server check
    checks.server = {
      status: 'pass',
      message: 'Server is responding',
      duration: Date.now() - startTime
    }

    // Environment check
    const requiredEnvVars = [
      'MONGODB_URI',
      'JWT_SECRET',
      'GMAIL_USER',
      'GMAIL_PASS',
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
      'NEXT_PUBLIC_API_URL'
    ]
    
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])
    
    if (missingEnvVars.length > 0) {
      checks.environment = {
        status: 'warning',
        message: `Missing environment variables: ${missingEnvVars.join(', ')}`
      }
    } else {
      checks.environment = {
        status: 'pass',
        message: 'All required environment variables are set'
      }
    }

    // Database connection check
    try {
      const dbStartTime = Date.now()
      await connectDB()
      checks.database = {
        status: 'pass',
        message: 'Database connection successful',
        duration: Date.now() - dbStartTime
      }
    } catch (error: any) {
      checks.database = {
        status: 'fail',
        message: `Database connection failed: ${error.message}`
      }
    }

    // Email service check
    try {
      const emailResult = await testEmailService()
      checks.email = {
        status: emailResult.success ? 'pass' : 'warning',
        message: emailResult.message
      }
    } catch (error: any) {
      checks.email = {
        status: 'warning',
        message: 'Email service check failed'
      }
    }

    // Determine overall health status
    const failures = Object.values(checks).filter(check => check.status === 'fail').length
    const warnings = Object.values(checks).filter(check => check.status === 'warning').length
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy'
    if (failures > 0) {
      overallStatus = 'unhealthy'
    } else if (warnings > 0) {
      overallStatus = 'degraded'
    } else {
      overallStatus = 'healthy'
    }

    // Memory usage
    const memoryUsage = process.memoryUsage()
    const totalMemory = memoryUsage.heapTotal
    const usedMemory = memoryUsage.heapUsed
    const memoryPercentage = Math.round((usedMemory / totalMemory) * 100)

    const healthData: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        server: 'up',
        database: checks.database?.status === 'pass' ? 'connected' : 'disconnected',
        email: checks.email?.status === 'pass' ? 'configured' : 
               checks.email?.status === 'warning' ? 'not_configured' : 'error'
      },
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      memory: {
        used: `${Math.round(usedMemory / 1024 / 1024)}MB`,
        total: `${Math.round(totalMemory / 1024 / 1024)}MB`,
        percentage: memoryPercentage
      },
      checks
    }

    const responseStatus = overallStatus === 'healthy' ? 200 : 
                          overallStatus === 'degraded' ? 200 : 503

    return NextResponse.json(healthData, { status: responseStatus })

  } catch (error: any) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error.message,
      checks
    }, { status: 503 })
  }
}
