import { Skeleton } from "@/components/ui/skeleton";

export default function DMLoading() {
    return (
        <div className="flex flex-1 flex-col">
            {/* DM header skeleton */}
            <div className="flex h-14 items-center gap-3 border-b px-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-5 w-28" />
            </div>

            {/* Messages skeleton */}
            <div className="flex-1 space-y-4 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                            <Skeleton
                                className="h-4"
                                style={{ width: `${Math.max(100, 280 - i * 35)}px` }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Message input skeleton */}
            <div className="border-t px-4 py-3">
                <Skeleton className="h-10 w-full rounded-lg" />
            </div>
        </div>
    );
}
