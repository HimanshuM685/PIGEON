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
                'relative overflow-hidden p-8 group transition-all duration-500 cursor-default bg-white rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-purple-50',
                'hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(192,132,252,0.15)] hover:border-purple-200',
                className
            )}
            {...props}
        >
            {/* Subtle pattern */}
            <div className="pointer-events-none absolute top-0 left-1/2 -mt-2 -ml-20 h-full w-full [mask-image:linear-gradient(white,transparent)] transition-opacity duration-500 opacity-50 group-hover:opacity-100">
                <div className="from-[rgba(192,132,252,0.08)] to-transparent absolute inset-0 bg-gradient-to-r [mask-image:radial-gradient(farthest-side_at_top,white,transparent)]">
                    <GridPattern
                        width={20}
                        height={20}
                        x="-12"
                        y="4"
                        squares={p}
                        className="fill-[rgba(192,132,252,0.1)] stroke-[rgba(192,132,252,0.15)] absolute inset-0 h-full w-full"
                    />
                </div>
            </div>

            {/* Hover Blob */}
            <div 
                className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-500"
                style={{ backgroundColor: (feature as any).color || 'var(--bg-purple)' }}
            />

            {/* Icon */}
            <div
                className="relative z-10 w-14 h-14 flex items-center justify-center mb-8 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 bg-purple-50 rounded-2xl shadow-sm text-[var(--bg-dark-purple)]"
            >
                <feature.icon className="size-6" strokeWidth={2} aria-hidden />
            </div>

            <h3 className="relative z-10 text-base md:text-lg font-bold tracking-tight text-[var(--text)] transition-colors duration-300">
                {feature.title}
            </h3>
            <p className="relative z-10 mt-3 text-sm font-medium text-gray-500 leading-relaxed">
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
