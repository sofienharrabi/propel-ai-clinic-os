"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@/components/ui/button";

export function SubmitButton({ children, ...props }: ButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} type="submit" disabled={pending || props.disabled}>
      {pending ? "Loading..." : children}
    </Button>
  );
}
