
'use client';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface ActionAlertProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actionHref: string;
    actionText: string;
}

export function ActionAlert({ icon: Icon, title, description, actionHref, actionText }: ActionAlertProps) {
    return (
        <Alert className="flex items-center justify-between">
            <div className="flex items-center">
                <Icon className="h-5 w-5 mr-4" />
                <div>
                    <AlertTitle>{title}</AlertTitle>
                    <AlertDescription>
                        {description}
                    </AlertDescription>
                </div>
            </div>
            <Button asChild>
                <Link href={actionHref}>
                    {actionText}
                </Link>
            </Button>
        </Alert>
    )
}
