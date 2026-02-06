# Sprint 06: Messages (Basic)

## Checklist

- [ ] Create message API routes (CRUD)
- [ ] Create MessageList component
- [ ] Create MessageItem component
- [ ] Create MessageInput component
- [ ] Implement cursor-based pagination
- [ ] Implement scroll to bottom
- [ ] Implement optimistic updates
- [ ] Implement markdown rendering
- [ ] Add message edit UI
- [ ] Add message delete UI
- [ ] Test message CRUD
- [ ] Test pagination

---

## File Structure

```
src/
├── app/api/
│   ├── channels/[id]/
│   │   └── messages/
│   │       └── route.ts      # GET (paginated), POST
│   └── messages/
│       └── [id]/
│           └── route.ts      # GET, PATCH, DELETE
├── components/chat/
│   ├── message-list.tsx
│   ├── message-item.tsx
│   ├── message-input.tsx
│   ├── message-actions.tsx
│   └── markdown-content.tsx
├── hooks/
│   └── use-messages.ts
└── lib/
    └── markdown.ts
```

---

## API Routes

### `GET /api/channels/[id]/messages`

Query params:

- `cursor` - Message ID to paginate from
- `limit` - Number of messages (default 50)
- `direction` - `before` (default) or `after`

Response:

```typescript
{
  messages: Message[],
  nextCursor: string | null,
  hasMore: boolean
}
```

Uses composite cursor: `(createdAt, id)` for stable pagination.

### `POST /api/channels/[id]/messages`

Body:

```typescript
{
  content: string,
  parentId?: string  // for threads (later)
}
```

- Renders markdown to `contentHtml`
- Returns created message with author

### `GET /api/messages/[id]`

- Get single message with author
- Requires channel access

### `PATCH /api/messages/[id]`

Body: `{ content: string }`

- Only author can edit
- Sets `editedAt` timestamp
- Re-renders markdown

### `DELETE /api/messages/[id]`

- Author OR channel admin+ OR org admin+
- Soft delete (sets `deletedAt`)

---

## Markdown Rendering

Use a lightweight markdown parser (marked or remark):

```typescript
// src/lib/markdown.ts
import { marked } from "marked";
import DOMPurify from "dompurify";

export function renderMarkdown(content: string): string {
    const html = marked.parse(content, { breaks: true });
    return DOMPurify.sanitize(html);
}
```

Support:

- Bold, italic, strikethrough
- Links (auto-link URLs)
- Code blocks with syntax highlighting
- Lists
- Blockquotes

---

## UI Components

### MessageList

- Virtualized list (for performance)
- Load more on scroll to top
- Auto-scroll to bottom on new messages
- Date separators between days
- Loading skeleton

### MessageItem

- Author avatar + name
- Timestamp (relative)
- Message content (rendered HTML)
- Edited indicator
- Hover actions (edit, delete, react)
- Edit mode inline

### MessageInput

- Multiline textarea
- Send on Enter (Shift+Enter for newline)
- Submit button
- Character limit indicator
- Disabled state while sending

### MessageActions

- Edit button (author only)
- Delete button (with confirm)
- Reply button (threads - later)
- Reaction button (later)

---

## Hooks

### useMessages(channelId)

```typescript
{
  messages: Message[],
  isLoading: boolean,
  hasMore: boolean,
  loadMore: () => void,
  sendMessage: (content: string) => Promise<void>,
  editMessage: (id: string, content: string) => Promise<void>,
  deleteMessage: (id: string) => Promise<void>,
}
```

Optimistic updates:

- Add message immediately to list
- Update on server response
- Rollback on error

---

## Message Display Logic

```typescript
// Deleted messages
if (message.deletedAt) {
  return <DeletedMessage />;  // "This message was deleted"
}

// Edited messages
const showEdited = message.editedAt && message.editedAt !== message.createdAt;
```

---

## Verification

- [ ] Can send messages
- [ ] Messages appear in correct order
- [ ] Pagination loads older messages
- [ ] Can edit own messages
- [ ] Can delete own messages
- [ ] Admin can delete any message
- [ ] Markdown renders correctly
- [ ] Links are clickable
- [ ] Code blocks have syntax highlighting
- [ ] Optimistic updates work
