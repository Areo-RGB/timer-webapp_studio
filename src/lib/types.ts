import type { MediaRef } from './media';

export type StepKind = 'normal' | 'start' | 'end';

export interface Behaviours {
	beep: boolean;
	voice: boolean;
	vibrate: boolean;
	/** Wait for the user before moving on (Android "Halt"). */
	halt: boolean;
	/** Beep on each of the last 3 seconds. */
	countdown: boolean;
	/** Play during the step. */
	music?: MediaRef & { loop: boolean };
	/** Shown on the player while the step runs. */
	image?: MediaRef;
	video?: MediaRef;
}

export interface Step {
	id: string;
	kind: 'step';
	label: string;
	/** Duration in milliseconds. */
	length: number;
	behaviours: Behaviours;
}

export interface Group {
	id: string;
	kind: 'group';
	name: string;
	loop: number;
	steps: Step[];
}

export type Item = Step | Group;

export interface Timer {
	id: string;
	name: string;
	loop: number;
	items: Item[];
	startStep: Step | null;
	endStep: Step | null;
	createdAt: number;
}

export const uid = () => crypto.randomUUID();

export const defaultBehaviours = (): Behaviours => ({
	beep: true,
	voice: false,
	vibrate: true,
	halt: false,
	countdown: false
});

export const newStep = (label = 'Step', length = 30_000): Step => ({
	id: uid(),
	kind: 'step',
	label,
	length,
	behaviours: defaultBehaviours()
});

export const newGroup = (): Group => ({
	id: uid(),
	kind: 'group',
	name: 'Group',
	loop: 2,
	steps: [newStep('Work', 30_000), newStep('Rest', 10_000)]
});

export const newTimer = (): Timer => ({
	id: uid(),
	name: '',
	loop: 1,
	items: [newStep('Work', 60_000)],
	startStep: null,
	endStep: null,
	createdAt: Date.now()
});

export function formatDuration(ms: number, showTenths = false): string {
	const total = Math.max(0, ms);
	const s = Math.floor(total / 1000);
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	const pad = (n: number) => n.toString().padStart(2, '0');
	const base = h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
	return showTenths ? `${base}.${Math.floor((total % 1000) / 100)}` : base;
}

export function itemDuration(item: Item): number {
	return item.kind === 'step'
		? item.length
		: item.loop * item.steps.reduce((a, s) => a + s.length, 0);
}

export function timerDuration(t: Timer): number {
	const body = t.items.reduce((a, i) => a + itemDuration(i), 0) * t.loop;
	return body + (t.startStep?.length ?? 0) + (t.endStep?.length ?? 0);
}
