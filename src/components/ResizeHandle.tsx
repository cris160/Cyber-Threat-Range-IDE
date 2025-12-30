import { useEffect, useState, useRef } from 'react';

interface ResizeHandleProps {
    direction: 'horizontal' | 'vertical';
    onResize: (delta: number) => void;
    className?: string;
}

export function ResizeHandle({ direction, onResize, className = '' }: ResizeHandleProps) {
    const [isDragging, setIsDragging] = useState(false);
    const startPos = useRef(0);

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
            const delta = currentPos - startPos.current;
            onResize(delta);
            startPos.current = currentPos;
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, direction, onResize]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
        document.body.style.cursor = direction === 'horizontal' ? 'ew-resize' : 'ns-resize';
        document.body.style.userSelect = 'none';
    };

    const isHorizontal = direction === 'horizontal';

    return (
        <div
            onMouseDown={handleMouseDown}
            className={`
                group
                ${isHorizontal ? 'w-1 cursor-ew-resize' : 'h-1 cursor-ns-resize'}
                ${isHorizontal ? 'hover:w-1' : 'hover:h-1'}
                flex items-center justify-center
                transition-all duration-150
                ${isDragging ? 'bg-[#007acc]' : 'bg-transparent hover:bg-[#007acc]'}
                ${className}
            `}
            style={{
                position: 'absolute',
                ...(isHorizontal
                    ? { right: 0, top: 0, bottom: 0, width: '4px' }
                    : { left: 0, right: 0, top: 0, height: '4px' }
                ),
                zIndex: 50
            }}
        >
            {/* Visual indicator */}
            <div
                className={`
                    ${isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                    transition-opacity duration-150
                    ${isHorizontal ? 'w-0.5 h-8' : 'h-0.5 w-8'}
                    bg-[#007acc] rounded-full
                `}
            />
        </div>
    );
}
