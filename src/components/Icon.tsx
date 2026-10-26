import React from 'react';

export const paths = {
	play: 'M8 5.5v13l11-6.5z',
	pause: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z',
	plus: 'M12 5v14M5 12h14',
	minus: 'M5 12h14',
	back: 'M15 6l-6 6 6 6',
	next: 'M6 6l8.5 6L6 18zM17 6h2v12h-2z',
	prev: 'M18 6l-8.5 6L18 18zM5 6h2v12H5z',
	trash: 'M5 7h14M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3',
	copy: 'M9 9h10v10H9zM5 15V5h10',
	edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
	up: 'M6 15l6-6 6 6',
	down: 'M6 9l6 6 6-6',
	repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 013-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 01-3 3H3',
	close: 'M6 6l12 12M18 6L6 18',
	check: 'M5 12.5l4.5 4.5L19 7',
	stop: 'M6 6h12v12H6z',
	folder: 'M3 7h6l2 2h10v10H3z',
	flag: 'M5 21V4h11l-2 4 2 4H5',
	expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
	shrink: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5'
} as const;

export type IconName = keyof typeof paths;

interface IconProps {
	name: IconName;
	size?: number;
	fill?: boolean;
	className?: string;
}

export default function Icon({ name, size = 20, fill = false, className = '' }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill={fill ? 'currentColor' : 'none'}
			stroke={fill ? 'none' : 'currentColor'}
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			className={className}
		>
			<path d={paths[name]} />
		</svg>
	);
}
