import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Team settings
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          This page is ready to host billing, automation, and advanced configuration flows once they&apos;re rebuilt
          for the new layout.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>Drop fresh components in as we flesh out real functionality.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Keep this placeholder in place until the new settings modules are ready to wire through the shared shell.
        </CardContent>
      </Card>
    </div>
  );
}
