type OrgRole = "owner" | "admin" | "member";
type ChannelRole = "owner" | "admin" | "member";

// Organization-level permissions
export function canManageOrganization(user: { orgRole: OrgRole }): boolean {
    return user.orgRole === "owner";
}

export function canManageMembers(user: { orgRole: OrgRole }): boolean {
    return user.orgRole === "owner" || user.orgRole === "admin";
}

export function canCreateChannels(user: { orgRole: OrgRole }): boolean {
    return user.orgRole === "owner" || user.orgRole === "admin";
}

export function canViewAllChannels(user: { orgRole: OrgRole }): boolean {
    return user.orgRole === "owner" || user.orgRole === "admin";
}

// Channel-level permissions
export function canManageChannel(
    user: { id: string; orgRole: OrgRole },
    channel: { ownerId: string },
    membership?: { role: ChannelRole } | null
): boolean {
    // Org owners and admins can manage any channel
    if (user.orgRole === "owner" || user.orgRole === "admin") {
        return true;
    }
    // Channel owner can manage their channel
    if (channel.ownerId === user.id) {
        return true;
    }
    // Channel admins can manage the channel
    if (membership?.role === "owner" || membership?.role === "admin") {
        return true;
    }
    return false;
}

export function canInviteToChannel(
    user: { id: string; orgRole: OrgRole },
    channel: { ownerId: string; isPrivate: boolean },
    membership?: { role: ChannelRole } | null
): boolean {
    // If public channel, anyone can invite
    if (!channel.isPrivate) {
        return true;
    }
    // For private channels, same as manage permissions
    return canManageChannel(user, channel, membership);
}

export function canViewChannel(
    user: { id: string; orgRole: OrgRole },
    channel: { isPrivate: boolean },
    membership?: { userId: string } | null
): boolean {
    // Org owners and admins can view all channels
    if (user.orgRole === "owner" || user.orgRole === "admin") {
        return true;
    }
    // Public channels are viewable by all
    if (!channel.isPrivate) {
        return true;
    }
    // Private channels require membership
    return membership?.userId === user.id;
}

export function canPostInChannel(
    user: { id: string; orgRole: OrgRole },
    channel: { isPrivate: boolean; archivedAt: Date | null },
    membership?: { userId: string } | null
): boolean {
    // Archived channels can't be posted to
    if (channel.archivedAt) {
        return false;
    }
    // Must be able to view the channel to post
    if (!canViewChannel(user, channel, membership)) {
        return false;
    }
    // For private channels, must be a member
    if (channel.isPrivate && membership?.userId !== user.id) {
        return false;
    }
    return true;
}

// Message-level permissions
export function canEditMessage(
    user: { id: string },
    message: { authorId: string; deletedAt: Date | null }
): boolean {
    // Can't edit deleted messages
    if (message.deletedAt) {
        return false;
    }
    // Only the author can edit
    return message.authorId === user.id;
}

export function canDeleteMessage(
    user: { id: string; orgRole: OrgRole },
    message: { authorId: string },
    channelMembership?: { role: ChannelRole } | null
): boolean {
    // Author can delete their own message
    if (message.authorId === user.id) {
        return true;
    }
    // Org owners and admins can delete any message
    if (user.orgRole === "owner" || user.orgRole === "admin") {
        return true;
    }
    // Channel admins can delete messages in their channel
    if (channelMembership?.role === "owner" || channelMembership?.role === "admin") {
        return true;
    }
    return false;
}

// Role comparison helpers
export function isHigherOrEqualRole(role1: OrgRole, role2: OrgRole): boolean {
    const roleHierarchy: Record<OrgRole, number> = {
        owner: 3,
        admin: 2,
        member: 1
    };
    return roleHierarchy[role1] >= roleHierarchy[role2];
}

export function canChangeUserRole(
    actor: { orgRole: OrgRole },
    targetCurrentRole: OrgRole,
    newRole: OrgRole
): boolean {
    // Only owner can change roles
    if (actor.orgRole !== "owner") {
        return false;
    }
    // Can't demote or promote to owner (transfer ownership instead)
    if (targetCurrentRole === "owner" || newRole === "owner") {
        return false;
    }
    return true;
}

export function canRemoveUser(
    actor: { id: string; orgRole: OrgRole },
    target: { id: string; orgRole: OrgRole }
): boolean {
    // Can't remove yourself
    if (actor.id === target.id) {
        return false;
    }
    // Only owner and admin can remove users
    if (actor.orgRole !== "owner" && actor.orgRole !== "admin") {
        return false;
    }
    // Admin can only remove members
    if (actor.orgRole === "admin" && target.orgRole !== "member") {
        return false;
    }
    // Owner can remove anyone except themselves
    return true;
}
