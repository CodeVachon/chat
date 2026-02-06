# Chat Application Implementation Plans

Modern real-time chat application with channels, direct messages, and role-based permissions.

## Tech Stack

- Next.js 16 + React 19 + TypeScript + Tailwind CSS v4
- PostgreSQL + Drizzle ORM
- better-auth (credentials, GitHub, Google)
- Socket.io + Redis (self-hosted)
- Cloudinary (file uploads)

## Sprint Overview

| Sprint                                            | Description                            | Status          |
| ------------------------------------------------- | -------------------------------------- | --------------- |
| [01-infrastructure](./01-infrastructure.md)       | Docker, dependencies, environment      | [ ] Not Started |
| [02-database](./02-database.md)                   | Drizzle schema and migrations          | [ ] Not Started |
| [03-authentication](./03-authentication.md)       | better-auth setup                      | [ ] Not Started |
| [04-setup-wizard](./04-setup-wizard.md)           | First-time setup flow                  | [ ] Not Started |
| [05-channels](./05-channels.md)                   | Channel CRUD and permissions           | [ ] Not Started |
| [06-messages](./06-messages.md)                   | Message CRUD and UI                    | [ ] Not Started |
| [07-realtime](./07-realtime.md)                   | WebSockets, presence, typing           | [ ] Not Started |
| [08-direct-messages](./08-direct-messages.md)     | DM conversations                       | [ ] Not Started |
| [09-advanced-messages](./09-advanced-messages.md) | Threads, reactions, attachments        | [ ] Not Started |
| [10-invitations](./10-invitations.md)             | Invite links, email, join requests     | [ ] Not Started |
| [11-admin](./11-admin.md)                         | Admin panel                            | [ ] Not Started |
| [12-polish](./12-polish.md)                       | Error handling, loading states, mobile | [ ] Not Started |

## Key Decisions

- **Deployment**: Self-hosted VPS (Railway/Render/DigitalOcean)
- **Real-time**: Socket.io + Redis adapter (no per-message costs)
- **DM Model**: Unified conversation + participants (extensible)
- **Permissions**: Org role overrides channel role

## Feature Summary

### Roles (Organization Level)

| Role       | Capabilities                                         |
| ---------- | ---------------------------------------------------- |
| **Owner**  | Full access, manage org settings, transfer ownership |
| **Admin**  | Manage members, create channels, manage all channels |
| **Member** | Access assigned channels, manage own profile         |

### Channels

- Public (anyone can join) or Private (invite only)
- Each has: name, emoji icon, description
- Channel-level roles: owner, admin, member
- "Town Hall" seeded on setup

### Messages

- Markdown formatting
- Edit/delete own messages
- Threads (replies)
- Reactions (emoji)
- File attachments (via Cloudinary)

### Direct Messages

- 1-on-1 conversations only
- Any member can DM any member
- Unread tracking

### Real-time Features

- Instant message delivery
- Typing indicators
- Online/offline presence

### Invitations (No open registration)

- Invite links (shareable, expirable)
- Email invites
- Request to join form

## Getting Started

1. Start with [Sprint 01: Infrastructure](./01-infrastructure.md)
2. Work through sprints in order (dependencies exist)
3. Check off items as completed
4. Each sprint has its own verification checklist
