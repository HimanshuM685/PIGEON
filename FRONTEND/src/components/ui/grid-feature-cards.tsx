import { cn } from '@/lib/utils';
import React from 'react';

type FeatureType = {
    title: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    description: string;
};

type FeatureCardProps = React.ComponentProps<'div'> & { feature: FeatureType; };

export function FeatureCard({ feature, className, ...props }: FeatureCardProps) {
    const p = genRandomPattern();

    return (
        <div
            className={cn(
                'relative overflow-hidden p-6 group transition-all duration-300 cursor-default bg-white',
                'hover:bg-[var(--bg-pink)]',
                className
            )}
            {...props}
        >
            {/* Subtle pattern */}
            <div className="pointer-events-none absolute top-0 left-1/2 -mt-2 -ml-20 h-full w-full [mask-image:linear-gradient(white,transparent)]">
                <div className="from-[rgba(69,39,118,0.04)] to-transparent absolute inset-0 bg-gradient-to-r [mask-image:radial-gradient(farthest-side_at_top,white,transparent)]">
                    <GridPattern
                        width={20}
                        height={20}
                        x="-12"
                        y="4"
                        squares={p}
                        className="fill-[rgba(69,39,118,0.06)] stroke-[rgba(69,39,118,0.08)] absolute inset-0 h-full w-full"
                    />
                </div>
            </div>

            {/* Icon */}
            <div
                className="relative z-10 w-10 h-10 flex items-center justify-center mb-10 transition-transform duration-300 group-hover:scale-110 bg-white border-2 border-[var(--border)] rounded-full shadow-[2px_2px_0px_#111111]"
            >
                <feature.icon className="size-5 text-[var(--text)]" strokeWidth={2} aria-hidden />
            </div>

            <h3 className="relative z-10 text-sm md:text-base font-bold uppercase tracking-widest text-[var(--text)] transition-colors duration-300">
                {feature.title}
            </h3>
            <p className="relative z-10 mt-2 text-xs font-semibold text-[var(--text-muted)] group-hover:text-[var(--text)] leading-relaxed">
                {feature.description}
            </p>
        </div>
    );
}

function GridPattern({ width, height, x, y, squares, ...props }: React.ComponentProps<'svg'> & { width: number; height: number; x: string; y: string; squares?: number[][] }) {
    const patternId = React.useId();
    return (
        <svg aria-hidden="true" {...props}>
            <defs>
                <pattern id={patternId} width={width} height={height} patternUnits="userSpaceOnUse" x={x} y={y}>
                    <path d={`M.5 ${height}V.5H${width}`} fill="none" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${patternId})`} />
            {squares && (
                <svg x={x} y={y} className="overflow-visible">
                    {squares.map(([x, y], index) => (
                        <rect strokeWidth="0" key={index} width={width + 1} height={height + 1} x={x * width} y={y * height} />
                    ))}
                </svg>
            )}
        </svg>
    );
}

function genRandomPattern(length?: number): number[][] {
    length = length ?? 5;
    return Array.from({ length }, () => [
        Math.floor(Math.random() * 4) + 7,
        Math.floor(Math.random() * 6) + 1,
    ]);
}
