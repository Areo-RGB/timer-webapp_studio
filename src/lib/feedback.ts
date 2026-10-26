import { TTS_ENABLED } from './features';

let ctx: AudioContext | null = null;

/** Must be called from a user gesture once to unlock audio on mobile. */
export function unlockAudio() {
	ctx ??= new AudioContext();
	if (ctx.state === 'suspended') void ctx.resume();
}

export function beep(times = 1, freq = 880) {
	if (!ctx) return;
	for (let i = 0; i < times; i++) {
		const t = ctx.currentTime + i * 0.25;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.frequency.value = freq;
		gain.gain.setValueAtTime(0.0001, t);
		gain.gain.exponentialRampToValueAtTime(0.4, t + 0.01);
		gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
		osc.connect(gain).connect(ctx.destination);
		osc.start(t);
		osc.stop(t + 0.2);
	}
}

export function speak(text: string) {
	if (!TTS_ENABLED || !('speechSynthesis' in window) || !text) return;
	speechSynthesis.cancel();
	const u = new SpeechSynthesisUtterance(text);
	u.lang = navigator.language;
	speechSynthesis.speak(u);
}

export function vibrate(pattern: number | number[] = [250, 250, 250]) {
	navigator.vibrate?.(pattern);
}
