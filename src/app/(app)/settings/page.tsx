"use client";

import { PreferencesForm } from "@/components/settings/preferences-form";
import { ProfileForm } from "@/components/settings/profile-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
    return (
        <div className="flex flex-1 flex-col overflow-auto">
            <div className="border-b p-6">
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-muted-foreground">Manage your account settings</p>
            </div>

            <div className="mx-auto w-full max-w-2xl p-6">
                <Tabs defaultValue="profile">
                    <TabsList>
                        <TabsTrigger value="profile">Profile</TabsTrigger>
                        <TabsTrigger value="preferences">Preferences</TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile" className="mt-4">
                        <ProfileForm />
                    </TabsContent>

                    <TabsContent value="preferences" className="mt-4">
                        <PreferencesForm />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
