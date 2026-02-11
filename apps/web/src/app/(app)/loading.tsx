import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="flex flex-1 flex-col">
            {/* Header skeleton */}
            <div className="flex h-14 items-center gap-3 border-b px-4">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-32" />
            </div>

            {/* Messages skeleton */}
            <div className="flex-1 space-y-4 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                            <Skeleton className="h-4 w-64" />
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
