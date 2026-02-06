# Sprint 05: Channels

## Checklist

- [ ] Create channel API routes (CRUD)
- [ ] Create channel member API routes
- [ ] Create permission helpers
- [ ] Create ChannelList component
- [ ] Create ChannelItem component
- [ ] Create ChannelHeader component
- [ ] Create CreateChannelModal
- [ ] Create ChannelSettings modal
- [ ] Create MemberManager component
- [ ] Create channels page layout
- [ ] Implement join/leave public channels
- [ ] Implement invite to private channels
- [ ] Implement ownership transfer scaffold
- [ ] Test permission enforcement

---

## File Structure

```
src/
├── app/
│   ├── (app)/
│   │   ├── layout.tsx      # AppShell with sidebar
│   │   ├── page.tsx        # Redirect to Town Hall
│   │   └── channels/
│   │       └── [id]/
│   │           └── page.tsx
│   └── api/
│       └── channels/
│           ├── route.ts              # GET (list), POST (create)
│           └── [id]/
│               ├── route.ts          # GET, PATCH, DELETE
│               ├── join/route.ts
│               ├── leave/route.ts
│               ├── members/
│               │   ├── route.ts      # GET, POST
│               │   └── [userId]/route.ts  # DELETE
│               └── transfer/route.ts
├── components/
│   ├── layout/
│   │   ├── app-shell.tsx
│   │   ├── sidebar.tsx
│   │   └── header.tsx
│   └── channel/
│       ├── channel-list.tsx
│       ├── channel-item.tsx
│       ├── channel-header.tsx
│       ├── create-channel-modal.tsx
│       ├── channel-settings.tsx
│       └── member-manager.tsx
└── lib/
    └── permissions.ts
```

---

## API Routes

### `GET /api/channels`

- Returns channels user can access
- Public channels + private channels user is member of
- Org admin+ sees all channels

### `POST /api/channels`

- Create new channel
- Requires: admin+ org role
- Auto-add creator as channel owner

### `GET /api/channels/[id]`

- Get channel details
- Requires: channel access

### `PATCH /api/channels/[id]`

- Update channel (name, emoji, description, isPrivate)
- Requires: channel admin+ OR org admin+

### `DELETE /api/channels/[id]`

- Archive channel (soft delete)
- Requires: channel owner OR org admin+

### `POST /api/channels/[id]/join`

- Join public channel
- Fails if channel is private

### `POST /api/channels/[id]/leave`

- Leave channel
- Cannot leave if only owner (must transfer first)

### `POST /api/channels/[id]/members`

- Add member to channel
- Requires: channel admin+ OR org admin+

### `DELETE /api/channels/[id]/members/[userId]`

- Remove member from channel
- Requires: channel admin+ OR org admin+

### `PATCH /api/channels/[id]/transfer`

- Transfer channel ownership
- Requires: current channel owner OR org owner

---

## Permission Helpers

`src/lib/permissions.ts`:

```typescript
// Organization level
canManageOrganization(user)  // owner only
canManageMembers(user)       // owner, admin
canCreateChannels(user)      // owner, admin
canViewAllChannels(user)     // owner, admin

// Channel level (org role overrides)
canViewChannel(user, channel, membership?)
canPostInChannel(user, channel, membership?)
canManageChannel(user, channel, membership?)
canInviteToChannel(user, channel, membership?)
canDeleteChannel(user, channel, membership?)
```

---

## UI Components

### ChannelList

- Grouped: Public / Private
- Shows emoji + name
- Unread indicator (later)
- Create button (admin+ only)

### ChannelItem

- Emoji icon
- Channel name
- Active state styling
- Context menu (settings, leave)

### CreateChannelModal

- Name input
- Emoji picker
- Description textarea
- Public/Private toggle
- Create button

### ChannelSettings

- Edit name, emoji, description
- Change visibility (with warning)
- Member management
- Danger zone: archive, transfer

### MemberManager

- List current members with roles
- Add member search/picker
- Remove member button
- Change role dropdown

---

## Verification

- [ ] Admin can create channels
- [ ] Member cannot create channels
- [ ] Anyone can join public channels
- [ ] Only invited users can access private channels
- [ ] Channel admins can add/remove members
- [ ] Channel owner can transfer ownership
- [ ] Org admin can manage any channel
- [ ] Cannot leave as only owner
