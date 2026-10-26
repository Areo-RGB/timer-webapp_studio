import clips from './ballmastery.json';
import { defaultBehaviours, type Behaviours, type Step, type Timer } from './types';

/** Synthesized by scripts/make-beats.py; precached with the app shell. */
const beat = (file: string, name: string) => ({ id: file, name, url: `/audio/${file}`, loop: true });
const PRACTICE_BEAT = beat('beat-locker-100bpm.m4a', 'Beat 100 BPM');
const TEMPO_BEAT = beat('beat-tempo-180bpm.m4a', 'Beat 180 BPM');

const step = (id: string, label: string, seconds: number, b: Partial<Behaviours> = {}): Step => ({
	id,
	kind: 'step',
	label,
	length: seconds * 1000,
	behaviours: { ...defaultBehaviours(), beep: false, vibrate: false, ...b }
});

/**
 * Ball mastery drills with Pascal Feber (youtu.be/2JSdhIPwjv8), one timer per level.
 * Each drill: watch the instruction clip (untimed: it loops until you press continue), get ready,
 * practise at ~50% to a 100 BPM beat, "Hopp!",
 * 10 s at full tempo to a 180 BPM beat, then rest before the next drill.
 */
function ballmasteryLevel(level: number): Timer {
	const drills = clips.filter((c) => c.level === level);
	const items = drills.flatMap((c, i) => {
		const id = `bm${level}-${i + 1}`;
		const steps = [
			step(`${id}-video`, c.drill, 0, {
				video: { id: `${id}-clip`, name: c.drill, url: `/clips/ballmastery/${c.file}`, sound: true }
			}),
			step(`${id}-ready`, 'Bereit machen', 5, { countdown: true, beep: true }),
			step(`${id}-easy`, `${c.drill} – locker`, 10, { voice: true, music: PRACTICE_BEAT }),
			step(`${id}-hopp`, 'Hopp!', 1, { voice: true, vibrate: true, beep: true }),
			step(`${id}-tempo`, 'Temporunde', 10, { countdown: true, beep: true, vibrate: true, music: TEMPO_BEAT })
		];
		if (i < drills.length - 1) steps.push(step(`${id}-rest`, 'Pause', 10, { voice: true, countdown: true }));
		return steps;
	});
	return {
		id: `ballmastery-level-${level}`,
		name: `Ballmastery Level ${level}`,
		loop: 1,
		items,
		startStep: null,
		endStep: null,
		createdAt: level
	};
}

/** Bump when the built-in timers change, so devices that already have them get the new version. */
export const SEED_VERSION = 4;

export const seedTimers = (): Timer[] => [1, 2, 3].map(ballmasteryLevel);
