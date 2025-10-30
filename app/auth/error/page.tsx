import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ErrorParams = {
  error?: string;
};

export default function Page({
  searchParams,
}: {
  searchParams?: ErrorParams;
}) {
  const errorMessage = searchParams?.error;

  return (
    <div className="space-y-6 text-center">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">We hit a snag</h2>
        <p className="text-sm text-muted-foreground">
          Let&apos;s get you back to KitchenSync.
        </p>
      </div>
      <Card className="border-emerald-900/10 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Authentication error</CardTitle>
          <CardDescription>
            {errorMessage
              ? `Message: ${errorMessage}`
              : "Something unexpected happened while signing you in."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You can try again, or head back to the login page to restart the process.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
