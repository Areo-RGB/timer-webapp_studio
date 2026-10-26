import React from 'react';
import Icon from './Icon';

interface StepperProps {
	value: number;
	onChange: (val: number) => void;
	min?: number;
	max?: number;
	label: string;
	dark?: boolean;
}

export default function Stepper({
	value = 1,
	onChange,
	min = 1,
	max = 999,
	label,
	dark = false
}: StepperProps) {
	const btn = `grid size-10 place-items-center transition-colors disabled:opacity-30 ${
		dark ? 'hover:bg-surface-dark-hover' : 'hover:bg-surface-2'
	}`;

	return (
		<div
			className={`flex items-center ${dark ? 'bg-surface-dark' : 'bg-surface'}`}
			role="group"
			aria-label={label}
		>
			<button
				type="button"
				className={btn}
				aria-label={`Decrease ${label}`}
				disabled={value <= min}
				onClick={() => onChange(Math.max(min, value - 1))}
			>
				<Icon name="minus" size={16} />
			</button>
			<span className="tabular min-w-10 text-center">{value}×</span>
			<button
				type="button"
				className={btn}
				aria-label={`Increase ${label}`}
				disabled={value >= max}
				onClick={() => onChange(Math.min(max, value + 1))}
			>
				<Icon name="plus" size={16} />
			</button>
		</div>
	);
}
