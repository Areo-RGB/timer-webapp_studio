import { beep, speak, vibrate } from './feedback';
import { mediaUrl } from './media';
import type { Step, Timer } from './types';
import { useEffect, useState } from 'react';

export interface FlatStep {
	step: Step;
	timerLoop: number;
	group: { name: string; loop: number; total: number } | null;
}

/** Expands loops and groups into the linear sequence of steps that will play. */
export function flatten(timer: Timer): FlatStep[] {
	const out: FlatStep[] = [];
	if (timer.startStep) out.push({ step: timer.startStep, timerLoop: 1, group: null });
	for (let l = 1; l <= Math.max(1, timer.loop); l++) {
		for (const item of timer.items) {
			if (item.kind === 'step') {
				out.push({ step: item, timerLoop: l, group: null });
			} else {
				for (let g = 1; g <= Math.max(1, item.loop); g++) {
					for (const s of item.steps) {
						out.push({
							step: s,
							timerLoop: l,
							group: { name: item.name, loop: g, total: item.loop }
						});
					}
				}
			}
		}
	}
	if (timer.endStep) out.push({ step: timer.endStep, timerLoop: timer.loop, group: null });
	return out;
}

export type RunState = 'idle' | 'running' | 'paused' | 'halted' | 'finished';

type Listener = () => void;

export class Runner {
	readonly sequence: FlatStep[];
	index = 0;
	remaining = 0;
	state: RunState = 'idle';

	#raf = 0;
	#last = 0;
	#lastWholeSecond = -1;
	#wakeLock: any = null;
	#audio: HTMLAudioElement | null = null;
	#audioId: string | null = null;
	#listeners = new Set<Listener>();

	constructor(readonly timer: Timer) {
		this.sequence = flatten(timer);
		this.remaining = this.sequence[0]?.step.length ?? 0;
	}

	subscribe(fn: Listener) {
		this.#listeners.add(fn);
		return () => {
			this.#listeners.delete(fn);
		};
	}

	private notify() {
		this.#listeners.forEach((fn) => fn());
	}

	get current(): FlatStep | undefined {
		return this.sequence[this.index];
	}

	get next(): FlatStep | undefined {
		return this.sequence[this.index + 1];
	}

	get stepLength(): number {
		return this.current?.step.length ?? 0;
	}

	get progress(): number {
		return this.stepLength ? 1 - this.remaining / this.stepLength : 1;
	}

	get totalRemaining(): number {
		return (
			this.remaining +
			this.sequence.slice(this.index + 1).reduce((a, f) => a + f.step.length, 0)
		);
	}

	/** Untimed steps (length 0, e.g. drill instructions) wait for the user instead of counting down. */
	get untimed(): boolean {
		return this.current?.step.length === 0;
	}

	start() {
		if (this.state === 'finished') this.goto(0);
		if (this.state === 'idle') this.#announce();
		this.state = 'running';
		this.#last = performance.now();
		cancelAnimationFrame(this.#raf);
		this.#raf = requestAnimationFrame(this.#tick);
		void this.#acquireWakeLock();
		this.#syncMusic();
		this.notify();
	}

	pause() {
		if (this.state !== 'running') return;
		this.state = 'paused';
		cancelAnimationFrame(this.#raf);
		this.#syncMusic();
		this.notify();
	}

	toggle() {
		if (this.untimed && this.state !== 'finished') return this.continueAfterHalt();
		if (this.state === 'running') this.pause();
		else if (this.state === 'halted') this.continueAfterHalt();
		else this.start();
	}

	continueAfterHalt() {
		this.#advance(true);
	}

	goto(i: number) {
		const wasRunning = this.state === 'running';
		this.index = Math.min(Math.max(0, i), this.sequence.length - 1);
		this.remaining = this.current ? this.current.step.length : 0;
		this.#lastWholeSecond = -1;
		if (this.state === 'finished' || this.state === 'halted') this.state = 'paused';
		if (wasRunning) this.#announce();
		this.#syncMusic();
		this.notify();
	}

	nextStep() {
		if (this.index >= this.sequence.length - 1) return this.#finish();
		this.goto(this.index + 1);
	}

	prevStep() {
		// Restart current step if we're more than 2s into it, like a music player.
		if (this.stepLength - this.remaining > 2000 || this.index === 0) this.goto(this.index);
		else this.goto(this.index - 1);
	}

	stop() {
		cancelAnimationFrame(this.#raf);
		void this.#wakeLock?.release?.();
		this.#wakeLock = null;
		if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
			window.speechSynthesis?.cancel();
		}
		this.#audio?.pause();
		this.#audio = null;
		this.notify();
	}

	/** Re-acquire the wake lock after the page becomes visible again. */
	onVisible() {
		if (this.state === 'running') void this.#acquireWakeLock();
	}

	#tick = (now: number) => {
		const dt = now - this.#last;
		this.#last = now;
		this.remaining -= dt;

		const b = this.current?.step.behaviours;
		if (b) {
			const sec = Math.ceil(this.remaining / 1000);
			if (b.countdown && sec !== this.#lastWholeSecond && sec >= 1 && sec <= 3) beep(1, 660);
			this.#lastWholeSecond = sec;
		}

		if (this.remaining <= 0) {
			this.remaining = 0;
			this.#onStepEnd();
		} else {
			this.notify();
		}
		if (this.state === 'running') this.#raf = requestAnimationFrame(this.#tick);
	};

	#onStepEnd() {
		const b = this.current?.step.behaviours;
		if (b?.beep) beep(3);
		if (b?.vibrate) vibrate();
		if (b?.halt || this.untimed) {
			this.state = 'halted';
			this.#syncMusic();
			this.notify();
			return;
		}
		this.#advance(false);
	}

	#advance(fromUser: boolean) {
		if (this.index >= this.sequence.length - 1) return this.#finish();
		this.index++;
		this.remaining = this.current ? this.current.step.length : 0;
		this.#lastWholeSecond = -1;
		this.#announce();
		if (fromUser || this.state === 'halted') this.start();
		else {
			this.#syncMusic();
			this.notify();
		}
	}

	#finish() {
		this.state = 'finished';
		this.remaining = 0;
		cancelAnimationFrame(this.#raf);
		beep(2, 1320);
		speak(`${this.timer.name || 'Timer'} finished`);
		void this.#wakeLock?.release?.();
		this.#wakeLock = null;
		this.#syncMusic();
		this.notify();
	}

	#announce() {
		if (this.current?.step.behaviours.voice) speak(this.current.step.label);
	}

	/** Plays the current step's music while running, pauses or switches it otherwise. */
	#syncMusic() {
		const music = this.state === 'running' ? this.current?.step.behaviours.music : undefined;
		if (!music) {
			this.#audio?.pause();
			return;
		}
		// Keyed by step position so a repeated step restarts its track.
		const key = `${this.index}:${music.id}`;
		if (this.#audioId === key && this.#audio) {
			this.#audio.loop = music.loop;
			if (this.#audio.paused && !this.#audio.ended) void this.#audio.play().catch(() => {});
			return;
		}
		this.#audio?.pause();
		const audio = new Audio();
		audio.loop = music.loop;
		this.#audio = audio;
		this.#audioId = key;
		void mediaUrl(music).then((url) => {
			if (!url || this.#audio !== audio) return;
			audio.src = url;
			if (this.state === 'running') void audio.play().catch(() => {});
		});
	}

	async #acquireWakeLock() {
		try {
			if (!this.#wakeLock || this.#wakeLock.released) {
				const nav = navigator as any;
				this.#wakeLock = (await nav.wakeLock?.request('screen')) ?? null;
			}
		} catch {
			/* not supported or denied */
		}
	}
}

export function useRunnerState(runner: Runner | null) {
	const [, setTick] = useState(0);

	useEffect(() => {
		if (!runner) return;
		return runner.subscribe(() => {
			setTick((t) => t + 1);
		});
	}, [runner]);

	return runner;
}
