import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 overflow-hidden after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.25),transparent)] after:-translate-x-full hover:after:translate-x-full after:transition-transform after:duration-700 after:ease-out",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-tr from-brand-start via-primary to-brand-end text-primary-foreground shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
        outline: "border border-input bg-transparent text-foreground hover:bg-secondary/60 shadow-sm hover:shadow",
        ghost: "hover:bg-secondary/60",
        destructive: "bg-gradient-to-tr from-red-500 to-rose-600 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-10 px-4",
        lg: "h-11 px-5",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";