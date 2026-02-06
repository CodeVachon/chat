import { relations } from "drizzle-orm";

import { accounts } from "./accounts";
import { channelMembers, channels } from "./channels";
import { conversationParticipants, conversations } from "./conversations";
import { emailInvites, inviteLinks, joinRequests } from "./invites";
import { attachments, messages, reactions } from "./messages";
import { sessions } from "./sessions";
import { userPreferences } from "./user-preferences";
import { users } from "./users";

// User relations
export const usersRelations = relations(users, ({ one, many }) => ({
    sessions: many(sessions),
    accounts: many(accounts),
    channelMemberships: many(channelMembers),
    ownedChannels: many(channels),
    messages: many(messages),
    reactions: many(reactions),
    conversationParticipations: many(conversationParticipants),
    inviteLinks: many(inviteLinks),
    emailInvites: many(emailInvites),
    preferences: one(userPreferences)
}));

// User preferences relations
export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
    user: one(users, {
        fields: [userPreferences.userId],
        references: [users.id]
    })
}));

// Session relations
export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, {
        fields: [sessions.userId],
        references: [users.id]
    })
}));

// Account relations
export const accountsRelations = relations(accounts, ({ one }) => ({
    user: one(users, {
        fields: [accounts.userId],
        references: [users.id]
    })
}));

// Channel relations
export const channelsRelations = relations(channels, ({ one, many }) => ({
    owner: one(users, {
        fields: [channels.ownerId],
        references: [users.id]
    }),
    members: many(channelMembers),
    messages: many(messages)
}));

// Channel member relations
export const channelMembersRelations = relations(channelMembers, ({ one }) => ({
    channel: one(channels, {
        fields: [channelMembers.channelId],
        references: [channels.id]
    }),
    user: one(users, {
        fields: [channelMembers.userId],
        references: [users.id]
    })
}));

// Message relations
export const messagesRelations = relations(messages, ({ one, many }) => ({
    author: one(users, {
        fields: [messages.authorId],
        references: [users.id]
    }),
    channel: one(channels, {
        fields: [messages.channelId],
        references: [channels.id]
    }),
    conversation: one(conversations, {
        fields: [messages.conversationId],
        references: [conversations.id]
    }),
    parent: one(messages, {
        fields: [messages.parentId],
        references: [messages.id],
        relationName: "thread"
    }),
    replies: many(messages, {
        relationName: "thread"
    }),
    reactions: many(reactions),
    attachments: many(attachments)
}));

// Reaction relations
export const reactionsRelations = relations(reactions, ({ one }) => ({
    message: one(messages, {
        fields: [reactions.messageId],
        references: [messages.id]
    }),
    user: one(users, {
        fields: [reactions.userId],
        references: [users.id]
    })
}));

// Attachment relations
export const attachmentsRelations = relations(attachments, ({ one }) => ({
    message: one(messages, {
        fields: [attachments.messageId],
        references: [messages.id]
    })
}));

// Conversation relations
export const conversationsRelations = relations(conversations, ({ many }) => ({
    participants: many(conversationParticipants),
    messages: many(messages)
}));

// Conversation participant relations
export const conversationParticipantsRelations = relations(conversationParticipants, ({ one }) => ({
    conversation: one(conversations, {
        fields: [conversationParticipants.conversationId],
        references: [conversations.id]
    }),
    user: one(users, {
        fields: [conversationParticipants.userId],
        references: [users.id]
    })
}));

// Invite link relations
export const inviteLinksRelations = relations(inviteLinks, ({ one }) => ({
    createdByUser: one(users, {
        fields: [inviteLinks.createdBy],
        references: [users.id]
    })
}));

// Email invite relations
export const emailInvitesRelations = relations(emailInvites, ({ one }) => ({
    invitedByUser: one(users, {
        fields: [emailInvites.invitedBy],
        references: [users.id]
    })
}));

// Join request relations
export const joinRequestsRelations = relations(joinRequests, ({ one }) => ({
    reviewedByUser: one(users, {
        fields: [joinRequests.reviewedBy],
        references: [users.id]
    })
}));
