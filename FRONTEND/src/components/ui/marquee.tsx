import * as React from "react"
import { cn } from "@/lib/utils"

interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
    pauseOnHover?: boolean
    direction?: "left" | "right"
    speed?: number
}

export function Marquee({
    children,
    pauseOnHover = false,
    direction = "left",
    speed = 30,
    className,
    ...props
}: MarqueeProps) {
    return (
        <div
            className={cn(
                "w-full overflow-hidden z-10",
                className
            )}
            {...props}
        >
            <div className="relative flex max-w-[90vw] overflow-hidden py-5 mx-auto">
                <div
                    className={cn(
                        "flex w-max animate-marquee",
                        pauseOnHover && "hover:[animation-play-state:paused]",
                        direction === "right" && "[animation-direction:reverse]"
                    )}
                    style={{ "--duration": `${speed}s` } as React.CSSProperties}
                >
                    {children}
                    {children}
                </div>
            </div>
        </div>
    )
}
