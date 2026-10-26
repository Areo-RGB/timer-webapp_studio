import React, { useRef, useState } from 'react';
import Icon from './Icon';

interface SwipeRowProps {
	children: React.ReactNode;
	onRemove?: () => void;
	className?: string;
}

export default function SwipeRow({ children, onRemove, className = '' }: SwipeRowProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [offset, setOffset] = useState(0);
	const [animating, setAnimating] = useState(false);
	const startX = useRef(0);
	const startY = useRef(0);
	const tracking = useRef<'idle' | 'pending' | 'swiping'>('idle');
	const currentDx = useRef(0);

	if (!onRemove) {
		return <div className={`relative border-b border-line bg-surface ${className}`}>{children}</div>;
	}

	const onPointerDown = (e: React.PointerEvent) => {
		if (e.pointerType === 'mouse' && e.button !== 0) return;
		startX.current = e.clientX;
		startY.current = e.clientY;
		currentDx.current = 0;
		tracking.current = 'pending';
		setAnimating(false);
	};

	const onPointerMove = (e: React.PointerEvent) => {
		if (tracking.current === 'idle') return;
		const mx = e.clientX - startX.current;
		const my = e.clientY - startY.current;

		if (tracking.current === 'pending') {
			if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) {
				tracking.current = 'idle';
				return;
			}
			if (Math.abs(mx) < 10) return;
			tracking.current = 'swiping';
			e.currentTarget.setPointerCapture(e.pointerId);
		}

		currentDx.current = mx;
		setOffset(mx);
	};

	const onPointerUp = () => {
		if (tracking.current !== 'swiping') {
			tracking.current = 'idle';
			return;
		}
		tracking.current = 'idle';
		const container = containerRef.current;
		const width = container ? container.offsetWidth : 300;
		const dx = currentDx.current;

		if (Math.abs(dx) > width * 0.4) {
			setAnimating(true);
			setOffset(Math.sign(dx) * width);
			setTimeout(() => {
				onRemove();
			}, 180);
		} else {
			setAnimating(true);
			setOffset(0);
		}
	};

	const onClickCapture = (e: React.MouseEvent) => {
		if (Math.abs(currentDx.current) >= 10) {
			e.stopPropagation();
			e.preventDefault();
			currentDx.current = 0;
		}
	};

	return (
		<div
			ref={containerRef}
			className={`relative overflow-hidden border-b border-line bg-bad [touch-action:pan-y] ${className}`}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onPointerCancel={onPointerUp}
			onClickCapture={onClickCapture}
		>
			<span
				className="absolute inset-y-0 left-4 flex items-center gap-2 text-sm text-white select-none pointer-events-none"
				aria-hidden="true"
			>
				<Icon name="trash" size={16} /> Remove
			</span>
			<span
				className="absolute inset-y-0 right-4 flex items-center gap-2 text-sm text-white select-none pointer-events-none"
				aria-hidden="true"
			>
				Remove <Icon name="trash" size={16} />
			</span>
			<div
				className="relative flex items-stretch bg-surface"
				style={{
					transform: offset ? `translateX(${offset}px)` : undefined,
					transition: animating ? 'transform 180ms ease-out' : 'none'
				}}
			>
				{children}
			</div>
		</div>
	);
}
