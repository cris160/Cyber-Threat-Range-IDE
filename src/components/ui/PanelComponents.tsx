import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface PanelHeaderProps {
    title: string;
    icon?: ReactNode;
    iconColor?: string;
    actions?: ReactNode;
    isCollapsible?: boolean;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

export function PanelHeader({
    title,
    icon,
    iconColor = '#00c8b4',
    actions,
    isCollapsible = false,
    isCollapsed = false,
    onToggleCollapse
}: PanelHeaderProps) {
    return (
        <motion.div
            className="flex items-center justify-between px-3 py-2.5 select-none"
            style={{
                background: 'linear-gradient(180deg, rgba(45, 45, 48, 0.8) 0%, rgba(37, 37, 38, 0.6) 100%)',
                borderBottom: '1px solid rgba(80, 80, 80, 0.3)',
                borderTopRightRadius: '16px'
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
        >
            <div className="flex items-center gap-2">
                {icon && (
                    <motion.div
                        style={{ color: iconColor }}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ duration: 0.2 }}
                    >
                        {icon}
                    </motion.div>
                )}
                <span
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={{
                        background: `linear-gradient(135deg, #fff 0%, ${iconColor} 100%)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}
                >
                    {title}
                </span>
            </div>

            <div className="flex items-center gap-1">
                {actions}
                {isCollapsible && (
                    <motion.button
                        onClick={onToggleCollapse}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                        animate={{ rotate: isCollapsed ? -90 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ChevronDown size={14} className="text-[#888]" />
                    </motion.button>
                )}
            </div>
        </motion.div>
    );
}

// Animated button with glow effect
interface PanelButtonProps {
    children: ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
    loading?: boolean;
    className?: string;
}

export function PanelButton({
    children,
    onClick,
    variant = 'secondary',
    disabled = false,
    loading = false,
    className = ''
}: PanelButtonProps) {
    const colors = {
        primary: {
            bg: 'rgba(0, 122, 204, 0.8)',
            border: 'rgba(0, 150, 255, 0.5)',
            glow: 'rgba(0, 150, 255, 0.3)'
        },
        secondary: {
            bg: 'rgba(60, 60, 60, 0.8)',
            border: 'rgba(100, 100, 100, 0.3)',
            glow: 'rgba(100, 100, 100, 0.2)'
        },
        danger: {
            bg: 'rgba(200, 50, 50, 0.8)',
            border: 'rgba(255, 80, 80, 0.5)',
            glow: 'rgba(255, 80, 80, 0.3)'
        }
    };

    const c = colors[variant];

    return (
        <motion.button
            onClick={onClick}
            disabled={disabled || loading}
            className={`px-3 py-1.5 rounded-md text-[12px] font-medium text-white transition-colors ${className}`}
            style={{
                background: c.bg,
                border: `1px solid ${c.border}`,
                opacity: disabled ? 0.5 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer'
            }}
            whileHover={!disabled ? {
                scale: 1.02,
                boxShadow: `0 0 20px ${c.glow}`
            } : {}}
            whileTap={!disabled ? { scale: 0.98 } : {}}
            transition={{ duration: 0.15 }}
        >
            {loading ? (
                <motion.span
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                >
                    Loading...
                </motion.span>
            ) : children}
        </motion.button>
    );
}

// Animated section with collapse
interface PanelSectionProps {
    title?: string;
    children: ReactNode;
    defaultExpanded?: boolean;
}

export function PanelSection({ title, children, defaultExpanded = true }: PanelSectionProps) {
    return (
        <motion.div
            className="border-b border-white/5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            {title && (
                <div className="px-3 py-2 text-[10px] font-semibold text-[#888] uppercase tracking-wide">
                    {title}
                </div>
            )}
            <motion.div
                initial={{ height: defaultExpanded ? 'auto' : 0 }}
                animate={{ height: 'auto' }}
                className="overflow-hidden"
            >
                {children}
            </motion.div>
        </motion.div>
    );
}
