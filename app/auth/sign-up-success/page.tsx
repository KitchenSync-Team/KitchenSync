import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="space-y-6 text-center">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">You&apos;re almost there</h2>
        <p className="text-sm text-muted-foreground">
          We&apos;ve sent a confirmation email to finish creating your KitchenSync account.
        </p>
      </div>
      <Card className="border-emerald-900/10 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Check your inbox</CardTitle>
          <CardDescription>Click the link in the message to activate your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Didn&apos;t get the email? Give it a minute and check spam. If it never shows up, try resending from the login page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
