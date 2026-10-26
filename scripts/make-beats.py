"""Synthesizes the practice and Temporunde beats into static/audio/ (needs numpy and ffmpeg).

Run: python3 scripts/make-beats.py
Each beat is a whole number of bars so it loops without a seam.
"""
import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np

SR = 44100
OUT = Path(__file__).resolve().parent.parent / 'static' / 'audio'
rng = np.random.default_rng(7)


def env(n, decay):
    return np.exp(-np.arange(n) / (decay * SR))


def kick(punch=1.0):
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    freq = 45 + 110 * np.exp(-t / 0.035)  # pitch drops fast: the "thump"
    phase = 2 * np.pi * np.cumsum(freq) / SR
    click = np.exp(-t / 0.002) * 0.3
    return (np.sin(phase) * env(n, 0.12) + click) * punch


def snare():
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    noise = rng.uniform(-1, 1, n)
    noise = noise - np.convolve(noise, np.ones(8) / 8, 'same')  # crude high-pass
    tone = np.sin(2 * np.pi * 185 * t) * env(n, 0.04)
    return (noise * env(n, 0.07) * 0.8 + tone * 0.5)


def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR)
    noise = rng.uniform(-1, 1, n)
    noise = noise - np.convolve(noise, np.ones(4) / 4, 'same')
    return noise * env(n, 0.06 if open_ else 0.012) * 0.35


def bass(freq, length):
    n = int(length * SR)
    t = np.arange(n) / SR
    wave_ = np.sign(np.sin(2 * np.pi * freq * t)) * 0.4 + np.sin(2 * np.pi * freq * t) * 0.6
    wave_ = np.convolve(wave_, np.ones(24) / 24, 'same')  # soften the square edge
    fade = np.minimum(1, np.arange(n) / (0.005 * SR)) * env(n, length * 0.6)
    return wave_ * fade * 0.18


def place(track, sound, at):
    i = int(at * SR)
    end = min(len(track), i + len(sound))
    track[i:end] += sound[: end - i]


def render(bpm, bars, pattern):
    beat = 60 / bpm
    total = bars * 4 * beat
    track = np.zeros(int(total * SR) + SR)  # tail room, folded back below for a clean loop
    for bar in range(bars):
        pattern(track, bar * 4 * beat, beat, bar)
    n = int(total * SR)
    track[:SR] += track[n : n + SR]  # wrap the tail into the start so the loop point is seamless
    track = track[:n]
    track = np.tanh(track * 1.1)  # glue + gentle limiting
    return track / np.max(np.abs(track)) * 0.89


def locker(track, start, beat, bar):
    """100 BPM: relaxed groove for the practice round."""
    roots = [55.0, 55.0, 49.0, 65.4][bar % 4]  # A, A, G, C
    for b in range(4):
        t = start + b * beat
        if b in (0, 2):
            place(track, kick(), t)
        if b in (1, 3):
            place(track, snare(), t)
        place(track, hat(), t)
        place(track, hat() * 0.6, t + beat / 2)
        place(track, bass(roots, beat * 0.9), t)
    place(track, kick(0.7), start + 2.5 * beat)


def tempo(track, start, beat, bar):
    """180 BPM: driving four-on-the-floor with 16th hats for the max-tempo round."""
    roots = [55.0, 55.0, 65.4, 49.0][bar % 4]
    for b in range(4):
        t = start + b * beat
        place(track, kick(1.1), t)
        if b in (1, 3):
            place(track, snare() * 1.1, t)
        for s in range(4):
            place(track, hat() * (1.0 if s % 2 else 0.55), t + s * beat / 4)
        place(track, bass(roots * 2, beat * 0.4), t + beat / 2)  # offbeat bass pushes it forward
    place(track, hat(open_=True), start + 3.5 * beat)


def export(name, samples):
    OUT.mkdir(parents=True, exist_ok=True)
    pcm = (samples * 32767).astype(np.int16)
    with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
        with wave.open(tmp.name, 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
        out = OUT / f'{name}.m4a'
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', tmp.name, '-c:a', 'aac', '-b:a', '96k', out], check=True)
        print(f'{out.name}: {len(samples) / SR:.2f}s, {out.stat().st_size // 1024} KB')


export('beat-locker-100bpm', render(100, 4, locker))  # 4 bars = 9.6 s
export('beat-tempo-180bpm', render(180, 8, tempo))  # 8 bars = 10.7 s
