import type { ReactNode } from "react"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"
import { Radio as RadioPrimitive } from "@base-ui/react/radio"

import { cn } from "@/lib/utils"

function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("flex items-center gap-4", className)}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  children,
  ...props
}: RadioPrimitive.Root.Props & { children?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <RadioPrimitive.Root
        data-slot="radio-group-item"
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full border border-input shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-checked:border-primary aria-checked:bg-primary disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        <RadioPrimitive.Indicator className="flex items-center justify-center">
          <span className="size-1.5 rounded-full bg-primary-foreground" />
        </RadioPrimitive.Indicator>
      </RadioPrimitive.Root>
      {children}
    </label>
  )
}

export { RadioGroup, RadioGroupItem }
