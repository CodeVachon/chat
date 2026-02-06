# Sprint 02: Database Schema

## Checklist

- [ ] Create organization schema
- [ ] Create users schema (with better-auth integration)
- [ ] Create channels schema
- [ ] Create channel_members schema
- [ ] Create messages schema
- [ ] Create reactions schema
- [ ] Create attachments schema
- [ ] Create conversations schema (DMs)
- [ ] Create conversation_participants schema
- [ ] Create invite_links schema
- [ ] Create email_invites schema
- [ ] Create join_requests schema
- [ ] Create schema index export
- [ ] Run initial migration
- [ ] Create seed script for Town Hall

---

## File Structure

```
src/db/
├── index.ts           # Database client
├── schema/
│   ├── index.ts       # Export all schemas
│   ├── organization.ts
│   ├── users.ts
│   ├── channels.ts
│   ├── messages.ts
│   ├── conversations.ts
│   └── invites.ts
└── migrations/
```

---

## Schema Details

### Organization (`src/db/schema/organization.ts`)

```typescript
export const organization = pgTable("organization", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    logoUrl: text("logo_url"),
    setupCompleted: boolean("setup_completed").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
});
```

### Users (`src/db/schema/users.ts`)

Fields: `id`, `email`, `name`, `avatarUrl`, `orgRole` (owner/admin/member), `status`, `statusMessage`, `emailVerified`, `createdAt`, `lastSeenAt`

Plus better-auth tables: `sessions`, `accounts`, `verifications`

### Channels (`src/db/schema/channels.ts`)

Fields: `id`, `name`, `emoji`, `description`, `isPrivate`, `ownerId`, `createdAt`, `archivedAt`

**Index**: `(id, createdAt)` for message queries

### Channel Members (`src/db/schema/channels.ts`)

Fields: `channelId`, `userId`, `role`, `joinedAt`, `lastReadAt`

**Primary Key**: `(channelId, userId)`
**Index**: `(userId)` for user's channel list

### Messages (`src/db/schema/messages.ts`)

Fields: `id`, `content`, `contentHtml`, `channelId`, `conversationId`, `authorId`, `parentId`, `editedAt`, `deletedAt`, `createdAt`

**Critical Index**: `(channelId, createdAt, id)` for pagination
**Index**: `(conversationId, createdAt, id)` for DM pagination
**Index**: `(authorId, createdAt)` for user history

### Reactions (`src/db/schema/messages.ts`)

Fields: `messageId`, `userId`, `emoji`, `createdAt`

**Unique**: `(messageId, userId, emoji)`

### Attachments (`src/db/schema/messages.ts`)

Fields: `id`, `messageId`, `cloudinaryId`, `url`, `filename`, `mimeType`, `size`

### Conversations (`src/db/schema/conversations.ts`)

Fields: `id`, `type` (dm), `createdAt`

### Conversation Participants (`src/db/schema/conversations.ts`)

Fields: `conversationId`, `userId`, `joinedAt`, `lastReadAt`

**Primary Key**: `(conversationId, userId)`
**Index**: `(userId)` for user's conversation list

### Invites (`src/db/schema/invites.ts`)

- `inviteLinks`: `id`, `code`, `createdBy`, `expiresAt`, `maxUses`, `useCount`, `isActive`
- `emailInvites`: `id`, `email`, `invitedBy`, `token`, `status`, `expiresAt`, `createdAt`
- `joinRequests`: `id`, `email`, `name`, `message`, `status`, `reviewedBy`, `createdAt`

---

## Enums

```typescript
export const orgRoleEnum = pgEnum("org_role", ["owner", "admin", "member"]);
export const channelRoleEnum = pgEnum("channel_role", ["owner", "admin", "member"]);
export const userStatusEnum = pgEnum("user_status", ["online", "away", "dnd", "offline"]);
export const inviteStatusEnum = pgEnum("invite_status", ["pending", "accepted", "expired"]);
export const requestStatusEnum = pgEnum("request_status", ["pending", "approved", "rejected"]);
```

---

## Verification

- [ ] `bun drizzle-kit generate` creates migration files
- [ ] `bun drizzle-kit push` applies schema to database
- [ ] All tables visible in PostgreSQL
- [ ] Indexes created correctly
- [ ] Seed script creates organization + Town Hall channel
