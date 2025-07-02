import { Logo } from "@/components/layout/logo";
import { Card } from "@/components/ui/card";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo className="h-10 w-10 text-primary" />
        </div>
        <Card className="shadow-2xl">
          {children}
        </Card>
      </div>
    </main>
  );
}
