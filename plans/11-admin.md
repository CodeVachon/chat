# Sprint 11: Admin Panel

## Checklist

- [ ] Create admin layout with navigation
- [ ] Create member management page
- [ ] Create channel management page
- [ ] Create invite management page
- [ ] Create organization settings page
- [ ] Implement role changes
- [ ] Implement member removal
- [ ] Implement bulk actions
- [ ] Test admin permissions

---

## File Structure

```
src/app/(app)/admin/
├── layout.tsx           # Admin layout with sidebar nav
├── page.tsx             # Dashboard/overview
├── members/
│   └── page.tsx         # Member management
├── channels/
│   └── page.tsx         # Channel management
├── invites/
│   └── page.tsx         # Invitation management
└── settings/
    └── page.tsx         # Organization settings

src/components/admin/
├── admin-nav.tsx
├── member-table.tsx
├── channel-table.tsx
├── role-select.tsx
└── stats-cards.tsx
```

---

## Access Control

Admin panel accessible to:

- **Owner**: Full access to everything
- **Admin**: Everything except organization settings and modifying owner

```typescript
// In admin layout
const user = await getCurrentUser();
if (user.orgRole === "member") {
    redirect("/");
}
```

---

## 1. Admin Dashboard

Overview page with stats:

- Total members
- Active members (last 7 days)
- Total channels
- Messages this week
- Pending join requests
- Active invite links

Quick actions:

- Invite members
- Create channel
- View pending requests

---

## 2. Member Management

### Features

- List all organization members
- Search/filter members
- Sort by name, role, joined date, last active
- Change member role (admin+ only)
- Remove member from organization
- View member profile

### UI Components

#### MemberTable

| Avatar | Name | Email    | Role  | Joined | Last Active | Actions |
| ------ | ---- | -------- | ----- | ------ | ----------- | ------- |
| [img]  | John | john@... | Admin | Jan 1  | 2h ago      | [...]   |

#### RoleSelect

Dropdown to change role:

- Member
- Admin
- Owner (transfer - only current owner can do this)

#### Member Actions

- View profile
- Change role
- Remove from org (with confirmation)

### API Routes

#### `PATCH /api/users/[id]/role`

Change user's organization role.

Body: `{ role: "admin" | "member" }`

Rules:

- Only owner can change anyone's role
- Admin can only change members to admin or vice versa
- Cannot demote self (owner)
- Cannot change owner's role (must transfer ownership)

#### `DELETE /api/users/[id]`

Remove user from organization.

Rules:

- Owner can remove anyone except self
- Admin can remove members only
- Removes from all channels
- Soft delete or hard delete?

---

## 3. Channel Management

### Features

- List all channels (including private)
- Create new channel
- Edit any channel
- Archive channel
- View channel members
- Add/remove members from any channel

### UI

#### ChannelTable

| Emoji | Name      | Type   | Owner | Members | Created | Actions |
| ----- | --------- | ------ | ----- | ------- | ------- | ------- |
| 🏛️    | Town Hall | Public | John  | 15      | Jan 1   | [...]   |

#### Channel Actions

- Edit channel
- View members
- Archive (soft delete)
- Transfer ownership

---

## 4. Invite Management

Consolidates:

- Invite links (from Sprint 10)
- Email invites
- Join requests

### Tabs

1. **Invite Links** - Create, list, revoke
2. **Email Invites** - Send, list pending
3. **Join Requests** - Approve, reject pending

---

## 5. Organization Settings (Owner Only)

### Features

- Edit organization name
- Change slug
- Upload/change logo
- Danger zone:
    - Transfer ownership
    - Delete organization

### Ownership Transfer

```typescript
// POST /api/organization/transfer
Body: { newOwnerId: string }

// Steps:
1. Verify current user is owner
2. Verify new owner exists and is admin
3. Set new user's role to owner
4. Set current user's role to admin
5. Log the transfer
```

---

## UI Components

### AdminNav

Sidebar navigation:

- Dashboard
- Members
- Channels
- Invites
- Settings (owner only)

### StatsCards

Grid of stat cards with:

- Icon
- Label
- Value
- Trend (optional)

---

## Permissions Matrix

| Action                 | Owner | Admin | Member |
| ---------------------- | ----- | ----- | ------ |
| View admin panel       | ✓     | ✓     | ✗      |
| View members           | ✓     | ✓     | ✗      |
| Change member to admin | ✓     | ✗     | ✗      |
| Change admin to member | ✓     | ✗     | ✗      |
| Remove member          | ✓     | ✓     | ✗      |
| Remove admin           | ✓     | ✗     | ✗      |
| View all channels      | ✓     | ✓     | ✗      |
| Create channel         | ✓     | ✓     | ✗      |
| Archive any channel    | ✓     | ✓     | ✗      |
| Manage invites         | ✓     | ✓     | ✗      |
| Organization settings  | ✓     | ✗     | ✗      |
| Transfer ownership     | ✓     | ✗     | ✗      |

---

## Verification

- [ ] Only admin+ can access admin panel
- [ ] Member list shows all users
- [ ] Owner can change any role
- [ ] Admin cannot change owner
- [ ] Admin cannot remove admin
- [ ] Channel list shows all channels
- [ ] Can manage any channel
- [ ] Invite management works
- [ ] Only owner sees settings
- [ ] Ownership transfer works
