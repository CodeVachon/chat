"use client";

const COMMON_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🔥", "👀", "✅", "❌"];

interface ReactionPickerProps {
    onSelect: (emoji: string) => void;
}

export function ReactionPicker({ onSelect }: ReactionPickerProps) {
    return (
        <div className="grid grid-cols-5 gap-1">
            {COMMON_REACTIONS.map((emoji) => (
                <button
                    key={emoji}
                    onClick={() => onSelect(emoji)}
                    className="hover:bg-muted rounded p-2 text-xl transition-colors"
                >
                    {emoji}
                </button>
            ))}
        </div>
    );
}
