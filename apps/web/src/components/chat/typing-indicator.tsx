"use client";

interface TypingIndicatorProps {
    typingUsers: { userId: string; userName: string }[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
    if (typingUsers.length === 0) return null;

    const names = typingUsers.map((u) => u.userName);
    let text: string;

    if (names.length === 1) {
        text = `${names[0]} is typing...`;
    } else if (names.length === 2) {
        text = `${names[0]} and ${names[1]} are typing...`;
    } else if (names.length === 3) {
        text = `${names[0]}, ${names[1]}, and ${names[2]} are typing...`;
    } else {
        text = `${names[0]}, ${names[1]}, and ${names.length - 2} others are typing...`;
    }

    return (
        <div className="text-muted-foreground flex items-center gap-2 px-4 py-1 text-sm">
            <span className="flex gap-1">
                <span className="animate-bounce" style={{ animationDelay: "0ms" }}>
                    •
                </span>
                <span className="animate-bounce" style={{ animationDelay: "150ms" }}>
                    •
                </span>
                <span className="animate-bounce" style={{ animationDelay: "300ms" }}>
                    •
                </span>
            </span>
            <span>{text}</span>
        </div>
    );
}
