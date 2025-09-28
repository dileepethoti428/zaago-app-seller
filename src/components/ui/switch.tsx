import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, checked, onCheckedChange, ...props }, ref) => (
  <div className={cn("flex rounded-lg border overflow-hidden", className)}>
    <button
      type="button"
      onClick={() => onCheckedChange?.(false)}
      className={cn(
        "px-3 py-1 text-xs font-medium transition-colors",
        !checked 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      )}
    >
      Off
    </button>
    <button
      type="button"
      onClick={() => onCheckedChange?.(true)}
      className={cn(
        "px-3 py-1 text-xs font-medium transition-colors",
        checked 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      )}
    >
      On
    </button>
  </div>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
