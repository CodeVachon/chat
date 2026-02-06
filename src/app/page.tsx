import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { auth } from "@/lib/auth";

export default async function RootPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        redirect("/login");
    }

    // Check if setup is complete
    const org = await db.query.organization.findFirst();
    if (!org?.setupCompleted) {
        redirect("/setup");
    }

    // Redirect to first channel
    const channel = await db.query.channels.findFirst({
        orderBy: (channels, { asc }) => [asc(channels.createdAt)]
    });

    if (channel) {
        redirect(`/channels/${channel.id}`);
    }

    redirect("/setup");
}
