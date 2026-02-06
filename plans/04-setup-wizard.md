# Sprint 04: First-Time Setup Wizard

## Checklist

- [ ] Create setup route group
- [ ] Create setup layout with stepper
- [ ] Step 1: Organization form
- [ ] Step 2: Owner account creation
- [ ] Step 3: Seed Town Hall channel
- [ ] Step 4: Invite team (optional)
- [ ] Create setup completion API
- [ ] Update middleware for setup guard
- [ ] Test complete setup flow

---

## File Structure

```
src/app/setup/
├── layout.tsx           # Setup layout with stepper
├── page.tsx             # Redirect to first incomplete step
├── organization/
│   └── page.tsx         # Step 1
├── account/
│   └── page.tsx         # Step 2
├── complete/
│   └── page.tsx         # Step 3 (auto-seeds data)
└── invite/
    └── page.tsx         # Step 4 (optional)
```

---

## Setup Flow

### Step 1: Create Organization

- Organization name (required)
- Slug (auto-generated from name, editable)
- Logo upload (optional, via Cloudinary)

API: `POST /api/setup/organization`

### Step 2: Create Owner Account

- If not already signed in:
    - Name, email, password form
    - OR GitHub/Google OAuth buttons
- If signed in via OAuth:
    - Just confirm/edit name
- Auto-assign `owner` role

API: `POST /api/setup/account`

### Step 3: Complete Setup

- Auto-create "Town Hall" public channel
- Auto-add owner as channel owner
- Set `organization.setupCompleted = true`
- Redirect to main app

API: `POST /api/setup/complete`

### Step 4: Invite Team (Optional)

- Generate invite link
- Email invite form (multiple emails)
- Skip button

---

## UI Components

### SetupLayout

- Progress stepper (1, 2, 3, 4)
- Clean centered card layout
- Logo at top

### OrganizationForm

- Name input with slug preview
- Logo upload dropzone
- Continue button

### AccountForm (if not signed in)

- Tabs: Credentials / OAuth
- Name, email, password fields
- GitHub/Google buttons
- Already have account? Link

---

## Middleware Update

```typescript
// In middleware.ts
// After session check:
// 1. Fetch organization setup status
// 2. If not completed and not on /setup, redirect to /setup
// 3. If completed and on /setup, redirect to /
```

---

## Seed Data

Town Hall channel:

```typescript
{
  name: "Town Hall",
  emoji: "🏛️",
  description: "Company-wide announcements and discussions",
  isPrivate: false,
  ownerId: ownerUserId,
}
```

---

## Verification

- [ ] Fresh database redirects to /setup
- [ ] Can create organization
- [ ] Can create owner account (credentials)
- [ ] Can create owner account (OAuth)
- [ ] Town Hall channel created on completion
- [ ] Owner is channel owner of Town Hall
- [ ] Setup complete redirects to main app
- [ ] Cannot access /setup after completion
