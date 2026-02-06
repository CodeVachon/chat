# Sprint 09: Advanced Message Features

## Checklist

- [ ] Implement threads (replies)
- [ ] Create thread API routes
- [ ] Create MessageThread component
- [ ] Implement reactions
- [ ] Create reaction API routes
- [ ] Create ReactionPicker component
- [ ] Implement file attachments
- [ ] Create upload API routes
- [ ] Create AttachmentPreview component
- [ ] Create AttachmentUploader component
- [ ] Configure Cloudinary
- [ ] Test threads, reactions, attachments

---

## File Structure

```
src/
├── app/api/
│   ├── messages/[id]/
│   │   ├── thread/route.ts     # GET thread replies
│   │   └── reactions/route.ts  # POST toggle reaction
│   └── upload/
│       ├── route.ts            # POST get signature
│       └── complete/route.ts   # POST register attachment
├── components/chat/
│   ├── message-thread.tsx
│   ├── thread-panel.tsx
│   ├── reaction-picker.tsx
│   ├── reaction-list.tsx
│   ├── attachment-preview.tsx
│   └── attachment-uploader.tsx
└── lib/
    └── cloudinary.ts
```

---

## 1. Threads (Replies)

### Database

Messages have `parentId` field pointing to parent message.

### API Routes

#### `GET /api/messages/[id]/thread`

Get all replies to a message.

Response:

```typescript
{
  parent: Message,
  replies: Message[],
  replyCount: number,
}
```

#### `POST /api/channels/[id]/messages`

Body now accepts `parentId`:

```typescript
{
  content: string,
  parentId?: string,
}
```

### UI

#### ThreadPanel

- Slide-out panel on right side
- Shows parent message at top
- List of replies below
- Message input at bottom
- Close button

#### MessageItem (updated)

- Show reply count: "3 replies"
- Click to open thread panel
- Indicator if message is a reply

### Real-time

```typescript
// Broadcast thread reply
io.to(`channel:${channelId}`).emit("thread:reply", {
    parentId,
    message
});
```

---

## 2. Reactions

### Database

`reactions` table: `messageId`, `userId`, `emoji`

Unique constraint on `(messageId, userId, emoji)` - one reaction per emoji per user.

### API Routes

#### `POST /api/messages/[id]/reactions`

Toggle reaction (add if not exists, remove if exists).

Body: `{ emoji: string }`

Response:

```typescript
{
  action: "added" | "removed",
  reactions: Array<{ emoji: string, count: number, hasReacted: boolean }>,
}
```

### UI

#### ReactionPicker

- Emoji picker popup
- Common emojis quick-access
- Search for more

#### ReactionList

- Shows reactions below message
- Each reaction: emoji + count
- Highlighted if current user reacted
- Click to toggle own reaction

#### MessageItem (updated)

- Reaction button in hover actions
- ReactionList below content

### Real-time

```typescript
io.to(`channel:${channelId}`).emit("reaction:update", {
    messageId,
    reactions
});
```

---

## 3. File Attachments (Cloudinary)

### Configuration

Create `src/lib/cloudinary.ts`:

```typescript
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export function generateSignature(folder: string) {
    const timestamp = Math.round(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
        { timestamp, folder },
        process.env.CLOUDINARY_API_SECRET!
    );
    return { timestamp, signature, folder };
}
```

### API Routes

#### `POST /api/upload`

Get Cloudinary signature for client-side upload.

Response:

```typescript
{
  signature: string,
  timestamp: number,
  cloudName: string,
  apiKey: string,
  folder: string,
}
```

#### `POST /api/upload/complete`

Register uploaded file as attachment.

Body:

```typescript
{
  messageId: string,
  cloudinaryId: string,
  url: string,
  filename: string,
  mimeType: string,
  size: number,
}
```

### Upload Flow

1. User selects file
2. Client requests signature from `/api/upload`
3. Client uploads directly to Cloudinary
4. On success, client sends message with attachment info
5. Server creates message + attachment record

### UI

#### AttachmentUploader

- Drag and drop zone
- File picker button
- Progress bar during upload
- Preview before sending
- Cancel button

#### AttachmentPreview

- Image: thumbnail with lightbox
- Video: video player
- Audio: audio player
- Other: file icon + name + size + download link

#### MessageInput (updated)

- Attachment button
- Preview of pending attachments
- Remove attachment button

### Supported File Types

```typescript
const ALLOWED_TYPES = {
    images: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    videos: ["video/mp4", "video/webm"],
    audio: ["audio/mpeg", "audio/wav", "audio/ogg"],
    documents: ["application/pdf", "text/plain"]
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
```

---

## Real-time Updates Summary

| Feature      | Event                     | Payload                  |
| ------------ | ------------------------- | ------------------------ |
| Thread reply | `thread:reply`            | { parentId, message }    |
| Reaction     | `reaction:update`         | { messageId, reactions } |
| Attachment   | (included in message:new) | -                        |

---

## Verification

### Threads

- [ ] Can reply to any message
- [ ] Thread panel shows parent + replies
- [ ] Reply count updates in real-time
- [ ] Can reply in thread panel

### Reactions

- [ ] Can add reaction to message
- [ ] Can remove own reaction
- [ ] Reaction count shows correctly
- [ ] Multiple users can react same emoji
- [ ] Real-time reaction updates

### Attachments

- [ ] Can upload images
- [ ] Can upload videos
- [ ] Can upload documents
- [ ] Progress shows during upload
- [ ] Preview displays correctly
- [ ] Can download attachments
- [ ] File size limit enforced
- [ ] Invalid file types rejected
