import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-9xl font-extrabold text-gray-300">404</h1>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Conversation not found
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            The conversation you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/chat"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Chat
          </Link>
          <Link
            href="/chat/new"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Start New Conversation
          </Link>
        </div>
      </div>
    </div>
  )
}