"use client";

import { Edit, MessageSquare, MoreHorizontal, Smile, Trash } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useFormattedDate } from "@/hooks/use-formatted-date";
import type { MessagePayload } from "@/lib/socket-events";
import { cn } from "@/lib/utils";

import { MessageEditForm } from "./message-edit-form";
import { ReactionPicker } from "./reaction-picker";

interface MessageItemProps {
    message: MessagePayload;
    isOwn: boolean;
    showAvatar: boolean;
    onEdit: (messageId: string, content: string) => void;
    onDelete: (messageId: string) => void;
    onReact: (messageId: string, emoji: string) => void;
    onThreadClick?: (messageId: string) => void;
}

export function MessageItem({
    message,
    isOwn,
    showAvatar,
    onEdit,
    onDelete,
    onReact,
    onThreadClick
}: MessageItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const { formatMessage } = useFormattedDate();

    const handleEdit = (content: string) => {
        onEdit(message.id, content);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="px-2 py-1">
                <MessageEditForm
                    initialContent={message.content}
                    onSave={handleEdit}
                    onCancel={() => setIsEditing(false)}
                />
            </div>
        );
    }

    return (
        <div
            className={cn("group relative flex gap-3 px-2 py-1", showAvatar ? "mt-4" : "mt-0.5")}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Avatar column */}
            <div className="w-10 shrink-0">
                {showAvatar && (
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={message.author.image || undefined} />
                        <AvatarFallback>
                            {message.author.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                )}
            </div>

            {/* Content column */}
            <div className="min-w-0 flex-1">
                {showAvatar && (
                    <div className="mb-1 flex items-baseline gap-2">
                        <span className="font-semibold">{message.author.name}</span>
                        <span className="text-muted-foreground text-xs">
                            {formatMessage(message.createdAt)}
                        </span>
                        {message.editedAt && (
                            <span className="text-muted-foreground text-xs">(edited)</span>
                        )}
                    </div>
                )}

                <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>

                {/* Reactions */}
                {message.reactions && message.reactions.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                        {message.reactions.map((reaction) => (
                            <button
                                key={reaction.emoji}
                                onClick={() => onReact(message.id, reaction.emoji)}
                                className={cn(
                                    "bg-muted hover:bg-muted/80 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                                    reaction.users.some((u) => u.id === message.authorId) &&
                                        "ring-primary ring-1"
                                )}
                            >
                                <span>{reaction.emoji}</span>
                                <span>{reaction.count}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {message.attachments.map((attachment) => (
                            <a
                                key={attachment.id}
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-muted hover:bg-muted/80 block max-w-xs overflow-hidden rounded-lg"
                            >
                                {attachment.mimeType?.startsWith("image/") ? (
                                    <Image
                                        src={attachment.url}
                                        alt={attachment.filename}
                                        width={320}
                                        height={192}
                                        className="max-h-48 object-contain"
                                        unoptimized
                                    />
                                ) : (
                                    <div className="p-2 text-sm">{attachment.filename}</div>
                                )}
                            </a>
                        ))}
                    </div>
                )}
            </div>

            {/* Actions */}
            {isHovered && (
                <div className="bg-card absolute -top-2 right-2 flex items-center gap-0.5 rounded-md border p-0.5 shadow-sm">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Smile className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2" align="end">
                            <ReactionPicker onSelect={(emoji) => onReact(message.id, emoji)} />
                        </PopoverContent>
                    </Popover>

                    {onThreadClick && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onThreadClick(message.id)}
                        >
                            <MessageSquare className="h-4 w-4" />
                        </Button>
                    )}

                    {isOwn && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => onDelete(message.id)}
                                    className="text-destructive"
                                >
                                    <Trash className="mr-2 h-4 w-4" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            )}
        </div>
    );
}
