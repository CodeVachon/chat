"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface MessageEditFormProps {
    initialContent: string;
    onSave: (content: string) => void;
    onCancel: () => void;
}

export function MessageEditForm({ initialContent, onSave, onCancel }: MessageEditFormProps) {
    const [content, setContent] = useState(initialContent);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = content.trim();
        if (trimmed && trimmed !== initialContent) {
            onSave(trimmed);
        } else {
            onCancel();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
        if (e.key === "Escape") {
            onCancel();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-2">
            <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[4rem]"
                autoFocus
            />
            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" size="sm" disabled={!content.trim()}>
                    Save
                </Button>
            </div>
            <p className="text-muted-foreground text-xs">Press Enter to save, Escape to cancel</p>
        </form>
    );
}
