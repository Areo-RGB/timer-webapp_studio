import { useEffect, useState } from 'react';
import { SEED_VERSION, seedTimers } from './seeds';
import type { Timer } from './types';

const KEY = 'timer-webapp:timers';
/**
 * Built-in timers already added, as id -> seed version. A deleted one isn't added back;
 * one from an older seed version is replaced in place (edits to it are overwritten).
 */
const SEEDED_KEY = 'timer-webapp:seeded';

function load(): Timer[] {
	let list: Timer[] = [];
	let seeded: Record<string, number> = {};
	try {
		const raw = localStorage.getItem(KEY);
		if (raw) list = JSON.parse(raw);
		const raw2 = JSON.parse(localStorage.getItem(SEEDED_KEY) ?? '{}');
		// Version 1 stored a plain list of ids.
		seeded = Array.isArray(raw2) ? Object.fromEntries(raw2.map((id: string) => [id, 1])) : raw2;
	} catch {
		/* ignore corrupt storage */
	}
	// Earlier versions created an example "HIIT sample" timer on first launch; drop it.
	let changed = false;
	const withoutSample = list.filter((t) => t.name !== 'HIIT sample');
	if (withoutSample.length !== list.length) {
		list = withoutSample;
		changed = true;
	}
	for (const seed of seedTimers().reverse()) {
		const version = seeded[seed.id];
		if (version === SEED_VERSION) continue;
		const i = list.findIndex((t) => t.id === seed.id);
		if (version === undefined) list.unshift(seed);
		else if (i !== -1) list[i] = seed;
		seeded[seed.id] = SEED_VERSION;
		changed = true;
	}
	if (changed) {
		localStorage.setItem(KEY, JSON.stringify(list));
		localStorage.setItem(SEEDED_KEY, JSON.stringify(seeded));
	}
	return list;
}

type Listener = () => void;

class TimerStore {
	all: Timer[] = load();
	private listeners = new Set<Listener>();

	subscribe(listener: Listener) {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	private notify() {
		this.listeners.forEach((fn) => fn());
	}

	get(id: string): Timer | undefined {
		return this.all.find((t) => t.id === id);
	}

	save(timer: Timer) {
		const snapshot = structuredClone(timer) as Timer;
		const i = this.all.findIndex((t) => t.id === timer.id);
		if (i === -1) this.all = [...this.all, snapshot];
		else {
			const updated = [...this.all];
			updated[i] = snapshot;
			this.all = updated;
		}
		this.persist();
	}

	remove(id: string) {
		this.all = this.all.filter((t) => t.id !== id);
		this.persist();
	}

	duplicate(id: string) {
		const t = this.get(id);
		if (!t) return;
		const copy = structuredClone(t) as Timer;
		copy.id = crypto.randomUUID();
		copy.name = `${t.name} (copy)`;
		copy.createdAt = Date.now();
		this.all = [...this.all, copy];
		this.persist();
	}

	private persist() {
		try {
			localStorage.setItem(KEY, JSON.stringify(this.all));
		} catch {
			/* ignore */
		}
		this.notify();
	}
}

export const timers = new TimerStore();

export function useTimers(): Timer[] {
	const [list, setList] = useState<Timer[]>(() => timers.all);

	useEffect(() => {
		return timers.subscribe(() => {
			setList([...timers.all]);
		});
	}, []);

	return list;
}
