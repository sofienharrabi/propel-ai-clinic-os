import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";
import React from "react";

export const Card = React.forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-zinc-800 bg-zinc-950/80 backdrop-blur-xl",
        className,
      )}
      {...props}
    />
  ),
);

Card.displayName = "Card";
