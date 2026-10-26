import React, { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon';
import MediaView from '../components/MediaView';
import { unlockAudio } from '#lib/feedback';
import { prefetchHosted } from '#lib/media';
import { Runner, useRunnerState } from '#lib/runner';
import { timers } from '#lib/timers';
import { formatDuration } from '#lib/types';

interface RunPageProps {
	timerId: string;
	onNavigate: (path: string) => void;
}

const RATES = [1, 0.75, 0.5];

export default function RunPage({ timerId, onNavigate }: RunPageProps) {
	const timer = timers.get(timerId);
	const runnerRef = useRef<Runner | null>(null);

	if (!runnerRef.current && timer) {
		runnerRef.current = new Runner(timer);
	}

	const runner = runnerRef.current;
	useRunnerState(runner);

	const [showList, setShowList] = useState(false);

	// Video preferences from localStorage
	const [videoMuted, setVideoMuted] = useState<boolean>(() => {
		try {
			const prefs = JSON.parse(localStorage.getItem('timer-webapp:video') ?? '{}');
			return prefs.muted ?? false;
		} catch {
			return false;
		}
	});

	const [videoRate, setVideoRate] = useState<number>(() => {
		try {
			const prefs = JSON.parse(localStorage.getItem('timer-webapp:video') ?? '{}');
			return RATES.includes(prefs.rate) ? prefs.rate : 1;
		} catch {
			return 1;
		}
	});

	const [controlsVisible, setControlsVisible] = useState(true);
	const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	function showControls() {
		setControlsVisible(true);
		clearTimeout(hideTimerRef.current);
		hideTimerRef.current = setTimeout(() => setControlsVisible(false), 2500);
	}

	const videoBoxRef = useRef<HTMLDivElement | null>(null);
	const [fullscreen, setFullscreen] = useState(false);

	const appIsFullscreen = () =>
		typeof window !== 'undefined' && window.matchMedia?.('(display-mode: fullscreen)').matches;

	function toggleFullscreen() {
		const screenAny = typeof screen !== 'undefined' ? (screen as any) : null;
		if (fullscreen) {
			screenAny?.orientation?.unlock?.();
			if (document.fullscreenElement) void document.exitFullscreen();
			setFullscreen(false);
		} else if (appIsFullscreen()) {
			setFullscreen(true);
			void screenAny?.orientation?.lock?.('landscape').catch(() => {});
		} else {
			void videoBoxRef.current
				?.requestFullscreen()
				.then(() => screenAny?.orientation?.lock?.('landscape'))
				.catch(() => {});
		}
	}

	const [videoPaused, setVideoPaused] = useState(false);
	const lastTapRef = useRef(0);
	const tapTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	function onVideoTap(e: React.PointerEvent) {
		if ((e.target as HTMLElement).closest('button')) return;
		showControls();
		clearTimeout(tapTimerRef.current);
		const now = e.timeStamp;
		if (now - lastTapRef.current < 300) {
			lastTapRef.current = 0;
			toggleFullscreen();
		} else {
			lastTapRef.current = now;
			tapTimerRef.current = setTimeout(() => setVideoPaused((p) => !p), 300);
		}
	}

	function saveVideoPrefs(muted: boolean, rate: number) {
		try {
			localStorage.setItem('timer-webapp:video', JSON.stringify({ muted, rate }));
		} catch {
			/* storage unavailable */
		}
	}

	// Prefetch clip URLs
	const clipUrls = useRef<string[]>([]);
	const [clipsDone, setClipsDone] = useState(0);

	useEffect(() => {
		if (!runner) return;
		clipUrls.current = [
			...new Set(
				runner.sequence.flatMap((f) =>
					[f.step.behaviours.video?.url, f.step.behaviours.image?.url, f.step.behaviours.music?.url].filter(
						(u): u is string => !!u
					)
				)
			)
		];
		if (clipUrls.current.length > 0) {
			void prefetchHosted(clipUrls.current, (n) => setClipsDone(n));
		}
	}, [runner]);

	// Lifecycle clean up runner on unmount
	useEffect(() => {
		return () => {
			runner?.stop();
		};
	}, [runner]);

	// Visibility change
	useEffect(() => {
		const handleVisibility = () => {
			if (document.visibilityState === 'visible') {
				runner?.onVisible();
			}
		};
		document.addEventListener('visibilitychange', handleVisibility);
		return () => document.removeEventListener('visibilitychange', handleVisibility);
	}, [runner]);

	// Fullscreen change
	useEffect(() => {
		const handleFs = () => {
			if (!appIsFullscreen()) {
				setFullscreen(!!videoBoxRef.current && document.fullscreenElement === videoBoxRef.current);
			}
		};
		document.addEventListener('fullscreenchange', handleFs);
		return () => document.removeEventListener('fullscreenchange', handleFs);
	}, []);

	// Keyboard controls
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (!runner || showList) return;
			if (e.code === 'Space') {
				e.preventDefault();
				unlockAudio();
				runner.toggle();
			} else if (e.key === 'ArrowRight') {
				runner.nextStep();
			} else if (e.key === 'ArrowLeft') {
				runner.prevStep();
			}
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [runner, showList]);

	if (!timer || !runner) {
		return (
			<main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
				<p className="text-muted">Timer not found.</p>
				<button onClick={() => onNavigate('/')} className="btn-ghost">
					Back to timers
				</button>
			</main>
		);
	}

	const cur = runner.current;
	const halted = runner.state === 'halted';
	const finished = runner.state === 'finished';

	return (
		<div className="flex min-h-dvh flex-1 flex-col">
			<header className="flex h-[calc(3rem+env(safe-area-inset-top))] items-center border-b border-line pt-[env(safe-area-inset-top)]">
				<button
					onClick={() => {
						runner.stop();
						onNavigate('/');
					}}
					className="icon-btn"
					aria-label="Close timer"
				>
					<Icon name="close" />
				</button>
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm">{timer.name}</p>
					{clipUrls.current.length > 0 && (
						<p className="tabular truncate text-xs text-muted">
							{clipsDone < clipUrls.current.length
								? `Saving videos for offline ${clipsDone}/${clipUrls.current.length}`
								: 'Videos available offline'}
						</p>
					)}
				</div>
				<button className="btn-ghost" onClick={() => setShowList(true)}>
					<span className="tabular">
						{runner.index + 1} of {runner.sequence.length}
					</span>
				</button>
			</header>

			{/* overall sequence progress bar */}
			<div className="flex h-1 gap-px bg-bg" aria-hidden="true">
				{runner.sequence.map((f, i) => (
					<div
						key={i}
						className="relative min-w-1 overflow-hidden bg-line"
						style={{ flexGrow: Math.max(1, f.step.length) }}
					>
						<div
							className={`absolute inset-y-0 left-0 ${halted ? 'bg-warn' : 'bg-accent'}`}
							style={{
								width: `${i < runner.index ? 100 : i === runner.index ? runner.progress * 100 : 0}%`
							}}
						/>
					</div>
				))}
			</div>

			<main className="flex flex-1 flex-col justify-center px-4">
				{!finished && cur && (cur.step.behaviours.video || cur.step.behaviours.image) && (
					<div
						ref={videoBoxRef}
						role="group"
						aria-label="Drill video. Double-tap for fullscreen."
						onPointerUp={onVideoTap}
						onPointerMove={(e) => e.pointerType === 'mouse' && showControls()}
						className={`touch-manipulation select-none bg-ink ${
							fullscreen ? 'fixed inset-0 z-50' : 'relative -mx-4 mb-6 aspect-video max-h-[38dvh]'
						} ${!controlsVisible ? 'cursor-none' : ''}`}
					>
						{cur.step.behaviours.video ? (
							<MediaView
								key={`${cur.step.id}-${runner.index}`}
								media={cur.step.behaviours.video}
								kind="video"
								playing={(runner.state === 'running' || halted || runner.untimed) && !videoPaused}
								muted={videoMuted}
								rate={videoRate}
							/>
						) : cur.step.behaviours.image ? (
							<MediaView
								key={`${cur.step.id}-${runner.index}`}
								media={cur.step.behaviours.image}
								kind="image"
								playing={false}
							/>
						) : null}

						{cur.step.behaviours.video && (
							<div
								className={`absolute inset-x-0 bottom-0 flex items-center bg-ink/80 text-sm text-white transition-opacity duration-300 ${
									controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
								}`}
							>
								{fullscreen && (halted || runner.untimed) && (
									<button
										className="h-12 bg-accent px-4 hover:bg-accent-hover"
										onClick={() => runner.continueAfterHalt()}
									>
										Continue
									</button>
								)}
								<span className="flex-1" />
								<button className="h-12 px-4 hover:bg-surface-dark-hover" onClick={toggleFullscreen}>
									{fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
								</button>
								{cur.step.behaviours.video.sound && (
									<button
										className="h-12 px-4 hover:bg-surface-dark-hover"
										aria-pressed={videoMuted}
										onClick={() => {
											const nextMuted = !videoMuted;
											setVideoMuted(nextMuted);
											saveVideoPrefs(nextMuted, videoRate);
											showControls();
										}}
									>
										{videoMuted ? 'Sound off' : 'Sound on'}
									</button>
								)}
								{RATES.map((r) => (
									<button
										key={r}
										className={`tabular h-12 min-w-12 px-3 ${
											videoRate === r ? 'bg-accent' : 'hover:bg-surface-dark-hover'
										}`}
										aria-pressed={videoRate === r}
										aria-label={`Play video at ${r} times speed`}
										onClick={() => {
											setVideoRate(r);
											saveVideoPrefs(videoMuted, r);
											showControls();
										}}
									>
										{r}×
									</button>
								))}
							</div>
						)}
					</div>
				)}

				<p className="text-sm text-muted">
					{cur?.step.behaviours.music && !finished && (
						<span className="mr-3">♪ {cur.step.behaviours.music.name}</span>
					)}
					{cur?.group ? (
						`${cur.group.name}, round ${cur.group.loop} of ${cur.group.total}`
					) : (
						<>&nbsp;</>
					)}
					{timer.loop > 1 && cur && (
						<span className="ml-3">
							Loop {cur.timerLoop} of {timer.loop}
						</span>
					)}
				</p>

				<h1 className="mt-1 text-[32px] leading-tight text-balance break-words">
					{finished ? 'Finished' : cur?.step.label}
				</h1>

				{(!runner.untimed || finished) && (
					<p
						className={`tabular -ml-[0.06em] font-light leading-none tracking-[-0.04em] ${
							runner.remaining >= 3_600_000
								? 'text-[min(22vw,8rem)]'
								: 'text-[min(31vw,11rem)]'
						} ${halted ? 'text-muted' : ''}`}
						aria-live="off"
					>
						{formatDuration(Math.ceil(runner.remaining / 1000) * 1000)}
					</p>
				)}

				{runner.untimed && !finished ? null : halted ? (
					<p className="mt-2 border-l-4 border-warn bg-surface px-4 py-3">
						Step complete. Press continue when you're ready.
					</p>
				) : (
					<p className="tabular mt-2 text-muted">
						{formatDuration(runner.totalRemaining)} remaining in total
					</p>
				)}
			</main>

			<div className="flex min-h-14 items-center gap-4 border-t border-line bg-surface px-4">
				{runner.next && !finished ? (
					<>
						<span className="text-sm text-muted">Next</span>
						<span className="min-w-0 flex-1 truncate">{runner.next.step.label}</span>
						<span className="tabular text-muted">
							{runner.next.step.length ? formatDuration(runner.next.step.length) : 'Video'}
						</span>
					</>
				) : (
					<span className="text-sm text-muted">{finished ? 'All steps done' : 'Last step'}</span>
				)}
			</div>

			<footer className="grid grid-cols-[1fr_2fr_1fr] gap-px bg-line pb-[env(safe-area-inset-bottom)]">
				<button
					className="grid h-20 place-items-center bg-bg hover:bg-surface"
					aria-label="Previous step"
					onClick={() => runner.prevStep()}
				>
					<Icon name="prev" fill />
				</button>
				<button
					className={`flex h-20 items-center justify-between px-5 text-white ${
						halted || (runner.untimed && !finished)
							? 'bg-ink hover:bg-surface-dark-hover'
							: 'bg-accent hover:bg-accent-hover active:bg-accent-pressed'
					}`}
					onClick={() => {
						unlockAudio();
						runner.toggle();
					}}
				>
					<span>
						{runner.untimed && !finished
							? 'Continue'
							: runner.state === 'running'
							? 'Pause'
							: halted
							? 'Continue'
							: finished
							? 'Restart'
							: runner.state === 'paused'
							? 'Resume'
							: 'Start'}
					</span>
					<Icon
						name={runner.state === 'running' && !runner.untimed ? 'pause' : 'play'}
						fill
						size={28}
					/>
				</button>
				<button
					className="grid h-20 place-items-center bg-bg hover:bg-surface"
					aria-label="Next step"
					onClick={() => runner.nextStep()}
				>
					<Icon name="next" fill />
				</button>
			</footer>

			{showList && (
				<dialog
					ref={(d) => {
						if (d && !d.open) d.showModal();
					}}
					onClose={() => setShowList(false)}
					onClick={(e) => {
						if (e.target === e.currentTarget) setShowList(false);
					}}
					className="m-0 mt-auto max-h-[80dvh] w-full max-w-none overflow-y-auto rounded-none border-t border-line bg-bg p-4 text-ink backdrop:bg-ink/50 sm:m-auto sm:max-w-md sm:rounded-none"
				>
					<h2 className="mb-3 text-xl">Jump to step</h2>
					<ol className="border-t border-line">
						{runner.sequence.map((f, i) => (
							<li key={i}>
								<button
									ref={(el) => {
										if (i === runner.index && el) {
											el.scrollIntoView({ block: 'center' });
										}
									}}
									className={`flex w-full items-center gap-3 min-h-12 px-3 text-left ${
										i === runner.index
											? 'border-l-4 border-accent bg-surface'
											: i < runner.index
											? 'text-muted'
											: 'hover:bg-surface-2'
									}`}
									onClick={() => {
										runner.goto(i);
										setShowList(false);
									}}
								>
									<span className="tabular w-6 text-right text-xs text-muted">{i + 1}</span>
									<span className="min-w-0 flex-1 truncate">
										{f.step.label}
										{f.group && (
											<span className="text-xs text-accent">
												{' '}
												· {f.group.name} {f.group.loop}/{f.group.total}
											</span>
										)}
									</span>
									<span className="tabular text-sm">
										{f.step.length ? formatDuration(f.step.length) : 'Video'}
									</span>
								</button>
							</li>
						))}
					</ol>
				</dialog>
			)}
		</div>
	);
}
