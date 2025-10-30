import { resolveDashboardData } from "@/components/dashboard/resolve-dashboard-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProfilePage() {
  const dashboard = await resolveDashboardData();
  const user = dashboard.user;
  const kitchen = dashboard.kitchen;

  const initials = (() => {
    const name = user.fullName ?? user.email ?? "KS";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  })();

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Profile & Preferences</h1>
        <p className="text-sm text-muted-foreground">
          Update your personal account details, dietary preferences, and notification settings for KitchenSync.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Basic details visible to other kitchen members.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 md:flex-row md:items-center md:gap-12">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatarUrl ?? undefined} alt={user.fullName ?? user.email ?? "KitchenSync member"} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-medium">{user.fullName ?? "KitchenSync Member"}</p>
              <p className="text-sm text-muted-foreground">{user.email ?? "No email on file"}</p>
              <p className="text-xs text-muted-foreground">Member of {kitchen.name}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 md:w-72">
            <Button variant="outline" disabled>
              Change Avatar
            </Button>
            <Button variant="outline" disabled>
              Edit Name
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Keep your account secure with up-to-date credentials.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            We&apos;ll surface controls for updating your email and password here soon.
          </p>
          <Button variant="outline" size="sm" disabled>
            Manage login details
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dietary Preferences</CardTitle>
          <CardDescription>Help your kitchen stay mindful of allergens and preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Allergens</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary">Peanuts</Badge>
              <Badge variant="outline">Gluten</Badge>
              <Badge variant="outline">Dairy</Badge>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Dietary styles</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary">Vegetarian</Badge>
              <Badge variant="outline">High Protein</Badge>
            </div>
          </div>
          <Button size="sm" variant="outline" disabled>
            Edit preferences
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Choose how KitchenSync keeps you in the loop.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Notification toggles will appear here so you can control weekly summaries and real-time alerts.
          </p>
          <Button size="sm" variant="outline" disabled>
            Configure notifications
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
