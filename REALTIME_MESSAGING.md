# Real-time Messaging Implementation

This document outlines the real-time messaging implementation for the chat application using lightweight polling with Supabase Realtime fallback.

## Features Implemented

### ✅ Option A - Optimized Polling (Primary Implementation)

1. **`/lib/hooks/usePolling.ts`** - Base polling utilities
   - Optimized polling with configurable intervals
   - Client-side deduplication to prevent duplicate messages
   - Automatic cleanup when components unmount
   - Network status monitoring
   - Local state management with version tracking

2. **`/lib/hooks/useMessages.ts`** - Message polling hook
   - Polls `/api/messages/conversation/[conversationId]` every 2 seconds
   - Optimistic UI updates for immediate feedback
   - Automatic deduplication and message merging
   - Offline support with cached data
   - Pagination support with load more functionality

3. **`/lib/hooks/useConversations.ts`** - Conversation polling hook
   - Polls `/api/conversations` every 3 seconds
   - Real-time conversation list updates
   - New conversation detection
   - Last message time tracking

4. **`/lib/hooks/useSendMessage.ts`** - Enhanced message sending
   - Optimistic UI updates for immediate feedback
   - Retry logic for failed sends (3 attempts with exponential backoff)
   - Offline message queuing
   - Error handling with user feedback
   - Queue management for failed messages

### ✅ Message Sync Utilities

**`/lib/hooks/messageSync.ts`** - Core synchronization logic
- Merge and deduplicate messages client-side
- Offline message caching and queue management
- Network status handling (online/offline detection)
- Message format conversion for UI components
- Graceful fallback to cached data when network fails

### ✅ Option B - Supabase Realtime (Alternative)

**`/lib/hooks/useRealtimeMessages.ts`** - WebSocket-based real-time updates
- Supabase WebSocket subscriptions for instant message delivery
- Automatic fallback to polling if WebSocket fails
- Real-time conversation updates
- Graceful error handling and reconnection

**`/lib/realtime/supabase.ts`** - Supabase client configuration
- Lightweight Supabase setup for minimal cost
- Real-time message and conversation subscriptions
- WebSocket failure detection and polling fallback
- Connection management and cleanup

## Architecture

### Polling Strategy
- **Messages**: Poll every 2 seconds for near real-time updates
- **Conversations**: Poll every 3 seconds for conversation list changes
- **Offline Behavior**: Reduce polling frequency when offline (10-15 seconds)
- **Deduplication**: Client-side message deduplication prevents duplicates

### Offline Support
- Messages are cached locally when offline
- Offline messages are queued and sent when connection is restored
- Cached conversations and messages available when network is unavailable
- Automatic retry mechanism for failed sends

### Performance Optimizations
- Efficient API calls with pagination (limit 50, skip for load more)
- Client-side deduplication reduces unnecessary re-renders
- Local state management with version tracking
- Memory leak prevention with proper cleanup

### Error Handling
- Network failure recovery with automatic retries
- Fallback to cached data when APIs are unavailable
- User-friendly error messages and retry options
- Graceful degradation when real-time features fail

## Usage Examples

### Basic Message Polling
```typescript
import { useMessages } from '@/lib/hooks/useMessages'

function ChatInterface({ conversationId }: { conversationId: string }) {
  const {
    messages,
    isLoading,
    sendMessage,
    markAsSeen,
    refresh,
    hasMore,
    loadMore
  } = useMessages({
    conversationId,
    pollInterval: 2000, // 2 seconds
    onNewMessage: (message) => {
      console.log('New message received:', message)
    }
  })

  const handleSend = async (content: string) => {
    await sendMessage(content)
  }

  return (
    <div>
      {/* Chat messages */}
      {messages.map(message => (
        <MessageBubble key={message.id} message={message} />
      ))}
      
      {/* Load more button */}
      {hasMore && (
        <button onClick={loadMore}>Load More Messages</button>
      )}
      
      {/* Send message input */}
      <MessageInput onSend={handleSend} />
    </div>
  )
}
```

### Conversation List with Polling
```typescript
import { useConversations } from '@/lib/hooks/useConversations'

function ConversationList() {
  const {
    conversations,
    isLoading,
    refresh,
    isPolling
  } = useConversations({
    pollInterval: 3000, // 3 seconds
    onNewConversation: (conversation) => {
      console.log('New conversation:', conversation)
    },
    onConversationUpdate: (conversation) => {
      console.log('Conversation updated:', conversation)
    }
  })

  return (
    <div>
      {conversations.map(conversation => (
        <ConversationItem key={conversation.id} conversation={conversation} />
      ))}
      {isPolling && <div>Syncing...</div>}
    </div>
  )
}
```

### Enhanced Message Sending
```typescript
import { useSendMessage } from '@/lib/hooks/useSendMessage'

function MessageSender({ conversationId }: { conversationId: string }) {
  const {
    sendMessage,
    isSending,
    error,
    queuedMessages,
    retryFailedMessages,
    clearQueue
  } = useSendMessage({
    retryAttempts: 3,
    retryDelay: 2000,
    onSuccess: (message) => {
      console.log('Message sent successfully:', message)
    },
    onError: (error, messageContent) => {
      console.error('Failed to send message:', error)
    }
  })

  const handleSend = async (content: string) => {
    try {
      await sendMessage(content, undefined, conversationId)
    } catch (error) {
      console.error('Message sending failed:', error)
    }
  }

  return (
    <div>
      <MessageInput onSend={handleSend} disabled={isSending} />
      {isSending && <div>Sending...</div>}
      {error && (
        <div>
          <p>Error: {error.message}</p>
          <button onClick={retryFailedMessages}>Retry Failed Messages</button>
        </div>
      )}
      {queuedMessages.length > 0 && (
        <div>
          <p>Queued messages: {queuedMessages.length}</p>
          <button onClick={clearQueue}>Clear Queue</button>
        </div>
      )}
    </div>
  )
}
```

### Supabase Real-time (Alternative)
```typescript
import { useRealtimeMessages } from '@/lib/hooks/useRealtimeMessages'

function RealtimeChat({ conversationId }: { conversationId: string }) {
  const {
    messages,
    isConnected,
    error,
    sendMessage
  } = useRealtimeMessages({
    conversationId,
    onNewMessage: (message) => {
      console.log('Real-time message:', message)
    },
    enableFallback: true
  })

  return (
    <div>
      <div>
        Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        {error && <div>Error: {error.message}</div>}
      </div>
      {/* Chat interface */}
    </div>
  )
}
```

## Configuration

### Environment Variables
Add to your `.env.local`:
```env
# Supabase Realtime (Optional - for WebSocket real-time messaging)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### API Endpoints Used
- `GET /api/messages/conversation/[conversationId]` - Fetch messages
- `POST /api/messages` - Send message
- `GET /api/conversations` - Fetch conversations
- `PATCH /api/messages/[messageId]/seen` - Mark message as seen

## Performance Metrics

### CPU Usage
- Minimal CPU impact with optimized polling intervals
- Client-side deduplication reduces unnecessary processing
- Efficient state management prevents memory leaks

### Network Efficiency
- Optimized queries with pagination (50 messages per request)
- Reduced polling frequency when offline (10-15 seconds vs 2-3 seconds)
- Automatic retry with exponential backoff

### Mobile Browser Support
- Works on all modern mobile browsers
- Progressive enhancement with offline capabilities
- Low memory footprint for mobile devices

## Acceptance Criteria Met

✅ **Messages appear in real-time** - 2-3 second delay for polling, instant for WebSocket  
✅ **No duplicate messages shown** - Client-side deduplication implemented  
✅ **Offline messages queue and send when online** - Full offline support with queuing  
✅ **CPU usage remains low** - Optimized polling and efficient state management  
✅ **Works on mobile browsers** - Tested and optimized for mobile performance  
✅ **Graceful fallback if WebSocket fails** - Automatic fallback to polling  

## Testing

The implementation includes:
- Network status monitoring
- Automatic retry mechanisms
- Offline/online state management
- Error recovery and user feedback
- Memory leak prevention with proper cleanup

## Future Enhancements

- Push notifications for new messages
- Background sync when app is closed
- Message encryption for enhanced security
- File upload with progress tracking
- Message reactions and threading