"use client";

import { Paperclip, Send, Smile } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

import { ReactionPicker } from "./reaction-picker";

interface MessageInputProps {
    onSend: (content: string) => void;
    onTyping?: () => void;
    placeholder?: string;
    disabled?: boolean;
}

export function MessageInput({
    onSend,
    onTyping,
    placeholder = "Type a message...",
    disabled = false
}: MessageInputProps) {
    const [content, setContent] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSubmit = useCallback(() => {
        const trimmed = content.trim();
        if (!trimmed || disabled) return;

        onSend(trimmed);
        setContent("");
        textareaRef.current?.focus();
    }, [content, disabled, onSend]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        onTyping?.();
    };

    const handleEmojiSelect = (emoji: string) => {
        setContent((prev) => prev + emoji);
        textareaRef.current?.focus();
    };

    return (
        <div className="border-t p-4">
            <div className="bg-muted flex items-center gap-2 rounded-lg px-2 py-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    disabled={disabled}
                >
                    <Paperclip className="h-5 w-5" />
                </Button>

                <Textarea
                    ref={textareaRef}
                    value={content}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="max-h-32 min-h-[36px] flex-1 resize-none border-0 bg-transparent py-2 shadow-none focus-visible:ring-0"
                    rows={1}
                />

                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            disabled={disabled}
                        >
                            <Smile className="h-5 w-5" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="end">
                        <ReactionPicker onSelect={handleEmojiSelect} />
                    </PopoverContent>
                </Popover>

                <Button
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={handleSubmit}
                    disabled={!content.trim() || disabled}
                >
                    <Send className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}
