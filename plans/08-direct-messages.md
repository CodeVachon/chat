# Sprint 08: Direct Messages

## Checklist

- [ ] Create DM API routes
- [ ] Create DMList component
- [ ] Create DMItem component
- [ ] Create StartDMModal component
- [ ] Create DM page
- [ ] Update sidebar with DM section
- [ ] Implement DM conversation lookup/creation
- [ ] Implement unread indicators
- [ ] Add real-time support for DMs
- [ ] Test DM flow end-to-end

---

## File Structure

```
src/
├── app/
│   ├── (app)/
│   │   └── dm/
│   │       └── [id]/
│   │           └── page.tsx
│   └── api/
│       └── dm/
│           ├── route.ts          # GET (list), POST (start/get)
│           └── [id]/
│               ├── route.ts      # GET conversation details
│               └── messages/
│                   └── route.ts  # GET, POST messages
├── components/dm/
│   ├── dm-list.tsx
│   ├── dm-item.tsx
│   └── start-dm-modal.tsx
└── hooks/
    └── use-dm.ts
```

---

## API Routes

### `GET /api/dm`

List user's DM conversations with last message preview.

Response:

```typescript
{
    conversations: Array<{
        id: string;
        otherUser: User;
        lastMessage: Message | null;
        unreadCount: number;
        lastReadAt: Date | null;
    }>;
}
```

### `POST /api/dm`

Start or get existing DM conversation with a user.

Body: `{ userId: string }`

Response:

```typescript
{
  conversation: Conversation,
  isNew: boolean,
}
```

Logic:

1. Check if conversation exists between current user and target
2. If exists, return it
3. If not, create new conversation + add both as participants

### `GET /api/dm/[id]`

Get conversation details with other participant.

### `GET /api/dm/[id]/messages`

Paginated messages (same pattern as channels).

Query: `?cursor=...&limit=50`

### `POST /api/dm/[id]/messages`

Send message in DM conversation.

Body: `{ content: string }`

---

## DM Lookup Pattern

Find existing conversation between two users:

```typescript
// Using conversation_participants table
const conversation = await db
    .select({ conversationId: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, user1Id))
    .innerJoin(
        conversationParticipants,
        and(
            eq(conversationParticipants.conversationId, conversationParticipants.conversationId),
            eq(conversationParticipants.userId, user2Id)
        )
    )
    .limit(1);
```

Or use a helper function that handles both directions.

---

## UI Components

### DMList

- Shows recent DM conversations
- Avatar + name of other user
- Last message preview (truncated)
- Unread badge
- Sorted by last message time

### DMItem

- User avatar with presence indicator
- User name
- Last message preview
- Timestamp (relative)
- Unread count badge
- Active state when selected

### StartDMModal

- Search/filter org members
- Shows user list with avatars
- Click to start DM
- Keyboard navigation

---

## Sidebar Update

```tsx
// src/components/layout/sidebar.tsx
<Sidebar>
    <ChannelSection>
        <ChannelList />
    </ChannelSection>

    <DMSection>
        <DMSectionHeader>
            <span>Direct Messages</span>
            <NewDMButton onClick={openStartDMModal} />
        </DMSectionHeader>
        <DMList />
    </DMSection>

    <UserSection>{/* Current user status */}</UserSection>
</Sidebar>
```

---

## Real-time Updates

### Socket rooms

- Each user joins `user:{userId}` room
- DM messages sent to both participants' user rooms

### Events

```typescript
// When sending DM
io.to(`user:${recipientId}`).emit("dm:message:new", message);
io.to(`user:${senderId}`).emit("dm:message:new", message);

// Update conversation list
io.to(`user:${recipientId}`).emit("dm:conversation:update", {
    conversationId,
    lastMessage: message
});
```

---

## Unread Tracking

`conversation_participants.lastReadAt` tracks when user last viewed conversation.

```typescript
// Mark as read when viewing conversation
await db
    .update(conversationParticipants)
    .set({ lastReadAt: new Date() })
    .where(
        and(
            eq(conversationParticipants.conversationId, conversationId),
            eq(conversationParticipants.userId, currentUserId)
        )
    );
```

```typescript
// Count unread
const unreadCount = await db
    .select({ count: count() })
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), gt(messages.createdAt, lastReadAt)));
```

---

## Verification

- [ ] Can start DM with any org member
- [ ] Existing DM opens instead of creating new
- [ ] DM list shows all conversations
- [ ] Messages send and receive
- [ ] Real-time updates in DM
- [ ] Unread count shows correctly
- [ ] Reading conversation marks as read
- [ ] Typing indicators work in DMs
