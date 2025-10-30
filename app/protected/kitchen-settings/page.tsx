import { resolveDashboardData } from "@/components/dashboard/resolve-dashboard-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function KitchenSettingsPage() {
  const dashboard = await resolveDashboardData();
  const kitchen = dashboard.kitchen;

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Kitchen Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your household kitchen details, members, and storage locations.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Kitchen Details</CardTitle>
          <CardDescription>General information about your shared kitchen.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Kitchen Name</p>
            <p className="text-lg font-medium">{kitchen.name}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Default Location</p>
              <p className="text-sm">
                {kitchen.locations.find((loc) => loc.isDefault)?.name ?? "Not set"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Members</p>
              <p className="text-sm">
                {typeof kitchen.memberCount === "number"
                  ? `${kitchen.memberCount} member${kitchen.memberCount === 1 ? "" : "s"}`
                  : "Unspecified"}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-2" disabled>
            Rename Kitchen (coming soon)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Locations</CardTitle>
            <CardDescription>Track where inventory lives across your kitchen.</CardDescription>
          </div>
          <Button size="sm" disabled>
            Add Location
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {kitchen.locations.length === 0 ? (
            <p className="text-sm text-muted-foreground">You haven&apos;t created any locations yet.</p>
          ) : (
            <div className="grid gap-3">
              {kitchen.locations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-center justify-between rounded-lg border border-emerald-200/60 bg-white p-4 dark:border-emerald-500/20 dark:bg-emerald-950/40"
                >
                  <div>
                    <p className="font-medium">{location.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {location.isDefault ? "Default storage" : "Inventory location"}
                    </p>
                  </div>
                  {location.isDefault && <Badge variant="secondary">Default</Badge>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Members</CardTitle>
            <CardDescription>Manage who can collaborate in this kitchen.</CardDescription>
          </div>
          <Button size="sm" disabled>
            Invite Member
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.isArray(kitchen.members) && kitchen.members.length > 0 ? (
            <div className="grid gap-3">
              {kitchen.members.map((member) => (
                <div key={member.userId} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                  <div>
                    <p className="font-medium">{member.name ?? member.email ?? "Member"}</p>
                    <p className="text-xs text-muted-foreground">{member.email ?? "Email pending"}</p>
                  </div>
                  <Badge variant="outline" className="uppercase">
                    {member.role}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No members yet. Invite teammates or family to collaborate.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
