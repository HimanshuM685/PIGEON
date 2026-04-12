import { useRef, type ReactNode, type MouseEvent } from 'react'

interface SpotlightCardProps {
    children: ReactNode
    className?: string
    spotlightColor?: string
}

export function SpotlightCard({
    children,
    className = '',
    spotlightColor = 'rgba(139, 92, 246, 0.15)',
}: SpotlightCardProps) {
    const cardRef = useRef<HTMLDivElement>(null)

    function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
        if (!cardRef.current) return
        const rect = cardRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        cardRef.current.style.setProperty('--spotlight-x', `${x}px`)
        cardRef.current.style.setProperty('--spotlight-y', `${y}px`)
    }

    function handleMouseLeave() {
        if (!cardRef.current) return
        cardRef.current.style.setProperty('--spotlight-x', '-999px')
        cardRef.current.style.setProperty('--spotlight-y', '-999px')
    }

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`spotlight-card ${className}`}
            style={
                {
                    '--spotlight-color': spotlightColor,
                    '--spotlight-x': '-999px',
                    '--spotlight-y': '-999px',
                } as React.CSSProperties
            }
        >
            {children}
        </div>
    )
}
