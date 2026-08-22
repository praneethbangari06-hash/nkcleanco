import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold cursor-pointer transition-smooth active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-card hover:shadow-glow hover:-translate-y-0.5",
        hero: "bg-gradient-primary text-primary-foreground shadow-glow hover:-translate-y-0.5 hover:brightness-[1.06]",
        mint: "bg-mint text-mint-foreground shadow-card hover:-translate-y-0.5 hover:brightness-[1.05]",
        soft: "bg-primary-soft text-primary hover:bg-accent hover:text-accent-foreground",
        destructive: "bg-destructive text-destructive-foreground shadow-soft hover:bg-destructive/90",
        outline:
          "border border-border bg-card shadow-soft hover:border-primary hover:text-primary hover:-translate-y-0.5",
        secondary: "bg-secondary text-secondary-foreground shadow-soft hover:bg-muted",
        ghost: "hover:bg-primary-soft hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline rounded-md",
      },
      size: {
        default: "h-13 px-6 py-2 text-[0.95rem]",
        sm: "h-10 px-4 text-[0.8rem]",
        lg: "h-14 px-8 text-[1.05rem]",
        xl: "h-16 px-9 text-lg sm:text-xl",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);


export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
