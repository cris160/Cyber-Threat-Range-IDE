import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

interface GlassPanelProps extends HTMLMotionProps<"div"> {
    children: ReactNode;
    width?: number | string;
    className?: string;
}

// Animation variants for smooth mounting
const panelVariants = {
    hidden: {
        opacity: 0,
        x: -20,
        filter: 'blur(10px)'
    },
    visible: {
        opacity: 1,
        x: 0,
        filter: 'blur(0px)',
        transition: {
            duration: 0.3,
            ease: [0.25, 0.1, 0.25, 1] as const,
            staggerChildren: 0.05
        }
    },
    exit: {
        opacity: 0,
        x: -20,
        filter: 'blur(10px)',
        transition: { duration: 0.2 }
    }
};

export function GlassPanel({ children, width, className = '', style, ...props }: GlassPanelProps) {
    return (
        <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`h-full flex flex-col relative ${className}`}
            style={{
                width: typeof width === 'number' ? `${width}px` : width,
                background: 'linear-gradient(180deg, rgba(37, 37, 38, 0.95) 0%, rgba(30, 30, 30, 0.98) 100%)',
                backdropFilter: 'blur(12px)',
                borderRight: '1px solid rgba(80, 80, 80, 0.3)',
                borderTopRightRadius: '16px',
                boxShadow: `
          inset 0 1px 0 rgba(255, 255, 255, 0.05),
          0 0 40px rgba(0, 0, 0, 0.3),
          0 0 1px rgba(0, 255, 200, 0.1)
        `,
                overflow: 'hidden',
                ...style
            }}
            {...props}
        >
            {/* Top accent glow */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '1px',
                    background: 'linear-gradient(90deg, transparent 0%, rgba(0, 200, 180, 0.4) 50%, transparent 100%)',
                    borderTopRightRadius: '16px'
                }}
            />
            {children}
        </motion.div>
    );
}

// Stagger animation for list items
export const listVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.03 }
    }
};

export const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as const }
    }
};
