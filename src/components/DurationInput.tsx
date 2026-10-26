import React from 'react';

interface DurationInputProps {
	value: number;
	onChange: (val: number) => void;
}

const presets = [10, 20, 30, 45, 60, 90, 120, 300];
const fmt = (sec: number) => (sec < 60 ? `${sec}s` : `${sec / 60}m`);

export default function DurationInput({ value = 0, onChange }: DurationInputProps) {
	const h = Math.floor(value / 3_600_000);
	const m = Math.floor((value % 3_600_000) / 60_000);
	const s = Math.floor((value % 60_000) / 1000);

	function setPart(part: 'h' | 'm' | 's', raw: string) {
		const n = Math.max(0, Math.floor(Number(raw) || 0));
		const next = { h, m, s, [part]: n };
		onChange((next.h * 3600 + next.m * 60 + next.s) * 1000);
	}

	const parts: { k: 'h' | 'm' | 's'; v: number; l: string; max: number }[] = [
		{ k: 'h', v: h, l: 'hr', max: 99 },
		{ k: 'm', v: m, l: 'min', max: 59 },
		{ k: 's', v: s, l: 'sec', max: 59 }
	];

	return (
		<div className="space-y-3">
			<div className="flex items-end justify-center gap-2">
				{parts.map((part, i) => (
					<React.Fragment key={part.k}>
						{i > 0 && <span className="pb-7 text-4xl font-light text-subtle">:</span>}
						<label className="flex flex-col items-center gap-1">
							<input
								type="number"
								inputMode="numeric"
								min="0"
								max={part.max}
								value={part.v.toString().padStart(2, '0')}
								onFocus={(e) => e.currentTarget.select()}
								onChange={(e) => setPart(part.k, e.currentTarget.value)}
								className="tabular w-[5.5rem] border-0 border-b border-subtle bg-surface py-2 text-center text-5xl font-light outline-none focus:border-b-2 focus:border-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
							/>
							<span className="text-xs text-muted">{part.l}</span>
						</label>
					</React.Fragment>
				))}
			</div>
			<div className="grid grid-cols-4 gap-px">
				{presets.map((p) => (
					<button
						key={p}
						type="button"
						className={`min-h-10 px-3 text-sm transition-colors ${
							value === p * 1000 ? 'bg-ink text-white' : 'bg-surface text-ink hover:bg-surface-2'
						}`}
						onClick={() => onChange(p * 1000)}
					>
						{fmt(p)}
					</button>
				))}
			</div>
		</div>
	);
}
