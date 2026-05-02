"use client";
import { cn } from "@/lib/utils";
import React, { type ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
    children: ReactNode;
    showRadialGradient?: boolean;
}

export const AuroraBackground = ({
    className,
    children,
    showRadialGradient = true,
    ...props
}: AuroraBackgroundProps) => {
    return (
        <main>
            <div
                className={cn(
                    "relative flex flex-col min-h-screen items-center justify-center transition-bg",
                    "bg-[#0D0A14]",
                    className
                )}
                {...props}
            >
                {/* Candy aurora layer */}
                <div className="absolute inset-0 overflow-hidden">
                    <div
                        className={cn(
                            `[--aurora:repeating-linear-gradient(100deg,#452776_10%,#5158A6_20%,#B7B0F3_30%,#452776_40%,#FFDD7C_50%)]
                            [--dark-gradient:repeating-linear-gradient(100deg,#0D0A14_0%,#0D0A14_7%,transparent_10%,transparent_12%,#0D0A14_16%)]
                            [background-image:var(--dark-gradient),var(--aurora)]
                            [background-size:300%,_200%]
                            [background-position:50%_50%,50%_50%]
                            filter blur-[12px]
                            after:content-[""] after:absolute after:inset-0
                            after:[background-image:var(--dark-gradient),var(--aurora)]
                            after:[background-size:200%,_100%]
                            after:animate-aurora after:[background-attachment:fixed] after:mix-blend-screen
                            pointer-events-none
                            absolute -inset-[10px] opacity-30 will-change-transform`,
                            showRadialGradient &&
                            `[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,transparent_70%)]`
                        )}
                    ></div>
                </div>

                {/* Fixed purple-to-black vignette */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: 'radial-gradient(ellipse 80% 60% at 15% 0%, rgba(69,39,118,0.25) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 85% 100%, rgba(81,88,166,0.15) 0%, transparent 60%)',
                    }}
                />

                {children}
            </div>
        </main>
    );
};
