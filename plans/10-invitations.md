# Sprint 10: Invitation System

## Checklist

- [ ] Create invite link API routes
- [ ] Create email invite API routes
- [ ] Create join request API routes
- [ ] Create invite accept page
- [ ] Create request access page
- [ ] Create InviteLinkManager component
- [ ] Create EmailInviteForm component
- [ ] Create JoinRequestList component
- [ ] Configure email sending (optional)
- [ ] Test invite link flow
- [ ] Test email invite flow
- [ ] Test join request flow

---

## File Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── invite/[code]/page.tsx    # Accept invite link
│   │   └── request-access/page.tsx   # Request to join form
│   └── api/
│       └── invites/
│           ├── link/
│           │   ├── route.ts          # GET list, POST create
│           │   └── [id]/route.ts     # DELETE revoke
│           ├── link/[code]/
│           │   └── accept/route.ts   # POST accept invite
│           ├── email/
│           │   └── route.ts          # POST send invite
│           └── requests/
│               ├── route.ts          # GET list, POST submit
│               └── [id]/route.ts     # PATCH approve/reject
├── components/invites/
│   ├── invite-link-manager.tsx
│   ├── email-invite-form.tsx
│   ├── join-request-list.tsx
│   └── join-request-form.tsx
└── lib/
    └── email.ts                      # Email sending (optional)
```

---

## 1. Invite Links

### API Routes

#### `GET /api/invites/link`

List active invite links (admin+ only).

Response:

```typescript
{
    links: Array<{
        id: string;
        code: string;
        createdBy: User;
        expiresAt: Date | null;
        maxUses: number | null;
        useCount: number;
        isActive: boolean;
        createdAt: Date;
    }>;
}
```

#### `POST /api/invites/link`

Create new invite link (admin+ only).

Body:

```typescript
{
  expiresIn?: number,    // hours, null = never
  maxUses?: number,      // null = unlimited
}
```

Response: Created link with code

#### `DELETE /api/invites/link/[id]`

Revoke/deactivate invite link (admin+ only).

#### `POST /api/invites/link/[code]/accept`

Accept invite and create account.

Body:

```typescript
{
  name: string,
  email: string,
  password: string,
}
// OR for OAuth: handled separately
```

Flow:

1. Validate code exists and is active
2. Check not expired
3. Check uses not exceeded
4. Create user with `member` role
5. Increment useCount
6. Sign in user
7. Redirect to app

### UI

#### Invite Link Page (`/invite/[code]`)

- Welcome message
- Organization name/logo
- Sign up form (name, email, password)
- OR OAuth buttons (GitHub, Google)
- Invalid/expired link handling

#### InviteLinkManager (Admin)

- List of active links
- Create new link button
- Copy link to clipboard
- Settings: expiry, max uses
- Revoke button

---

## 2. Email Invites

### API Routes

#### `POST /api/invites/email`

Send email invite(s) (admin+ only).

Body:

```typescript
{
  emails: string[],  // up to 10 at once
}
```

Creates `email_invites` records with unique tokens.
Optionally sends emails with invite links.

### Email Template (if sending)

```
Subject: You've been invited to join [Org Name]

Hi,

You've been invited to join [Org Name] on [App Name].

Click the link below to create your account:
[INVITE_URL]

This link expires in 7 days.

If you didn't expect this invitation, you can ignore this email.
```

### UI

#### EmailInviteForm

- Textarea for emails (one per line or comma-separated)
- Send button
- Success/error feedback
- List of pending invites

---

## 3. Join Requests

### API Routes

#### `POST /api/invites/requests`

Submit request to join (public, unauthenticated).

Body:

```typescript
{
  name: string,
  email: string,
  message?: string,  // "Why do you want to join?"
}
```

Creates `join_requests` record with `pending` status.

#### `GET /api/invites/requests`

List pending requests (admin+ only).

#### `PATCH /api/invites/requests/[id]`

Approve or reject request (admin+ only).

Body:

```typescript
{
  status: "approved" | "rejected",
}
```

If approved:

- Create user account
- Send email with temp password or magic link
- Set status to `approved`

If rejected:

- Set status to `rejected`
- Optionally send rejection email

### UI

#### Request Access Page (`/request-access`)

- Form: name, email, message
- Submit button
- Success message: "Your request has been submitted"
- Organization name/logo

#### JoinRequestList (Admin)

- List of pending requests
- Name, email, message preview
- Date submitted
- Approve/Reject buttons
- Bulk actions (optional)

---

## Email Sending (Optional)

For MVP, can use:

- Log emails to console (development)
- Resend, SendGrid, or AWS SES (production)

```typescript
// src/lib/email.ts
export async function sendEmail(options: { to: string; subject: string; html: string }) {
    if (process.env.NODE_ENV === "development") {
        console.log("Email:", options);
        return;
    }
    // Production: use email service
}
```

---

## Middleware Update

Update `src/middleware.ts` to allow:

- `/invite/[code]` - public
- `/request-access` - public
- `/api/invites/link/[code]/accept` - public
- `/api/invites/requests` POST - public

---

## Verification

### Invite Links

- [ ] Admin can create invite link
- [ ] Link can be copied
- [ ] New user can accept invite
- [ ] OAuth signup works with invite
- [ ] Expired links rejected
- [ ] Max uses enforced
- [ ] Admin can revoke link

### Email Invites

- [ ] Admin can send email invites
- [ ] Email contains correct link
- [ ] Link leads to signup page
- [ ] Token validated on accept

### Join Requests

- [ ] Anyone can submit request
- [ ] Admin sees pending requests
- [ ] Admin can approve request
- [ ] Admin can reject request
- [ ] Approved user can sign in
