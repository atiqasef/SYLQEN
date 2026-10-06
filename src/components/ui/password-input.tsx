"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  toggleLabelShow?: string;
  toggleLabelHide?: string;
};

export function PasswordInput({
  className,
  toggleLabelShow = "Show password",
  toggleLabelHide = "Hide password",
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        className={cn("pr-20", className)}
        autoComplete={props.autoComplete}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute top-1/2 right-1 h-8 -translate-y-1/2 px-2 text-xs text-muted-foreground"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? toggleLabelHide : toggleLabelShow}
        aria-pressed={visible}
      >
        {visible ? "Hide" : "Show"}
      </Button>
    </div>
  );
}
