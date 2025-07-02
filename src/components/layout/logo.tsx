import { cn } from "@/lib/utils";
import { Stethoscope } from "lucide-react";
import type { SVGProps } from "react";

export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <div className="flex items-center gap-2">
      <Stethoscope className={cn("h-8 w-8", className)} {...props} />
      <span className="text-xl font-bold font-headline">MediStock</span>
    </div>
  );
}
