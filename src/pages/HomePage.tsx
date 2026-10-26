import React, { useEffect, useState } from 'react';
import Icon from '../components/Icon';
import { EDITING_ENABLED } from '#lib/features';
import { unlockAudio } from '#lib/feedback';
import { cachedHosted, hostedUrls, prefetchHosted } from '#lib/media';
import { timers, useTimers } from '#lib/timers';
import { formatDuration, itemDuration, timerDuration, type Timer } from '#lib/types';

interface HomePageProps {
	onNavigate: (path: string) => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
	const allTimers = useTimers();
	const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

	const stepCount = (t: Timer) =>
		t.items.reduce((a, i) => a + (i.kind === 'step' ? 1 : i.steps.length), 0);

	function play(id: string) {
		unlockAudio();
		onNavigate(`/run/${id}`);
	}

	const appIsFullscreen = typeof window !== 'undefined' && window.matchMedia?.('(display-mode: fullscreen)').matches;
	const canFullscreen = typeof document !== 'undefined' && !appIsFullscreen && !!document.fullscreenEnabled;
	const [isFullscreen, setIsFullscreen] = useState(
		typeof document !== 'undefined' ? !!document.fullscreenElement : false
	);

	useEffect(() => {
		const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
		document.addEventListener('fullscreenchange', handleFs);
		return () => document.removeEventListener('fullscreenchange', handleFs);
	}, []);

	function toggleFullscreen() {
		if (document.fullscreenElement) {
			void document.exitFullscreen();
		} else {
			void document.documentElement.requestFullscreen().catch(() => {});
		}
	}

	const videoUrls = hostedUrls(allTimers, ['video']);
	const [offline, setOffline] = useState<Set<string>>(new Set());
	const [downloading, setDownloading] = useState(false);
	const [failed, setFailed] = useState(false);
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		if (videoUrls.length > 0) {
			cachedHosted(videoUrls).then((s) => setOffline(s));
		}
	}, [allTimers]);

	async function downloadAll() {
		setDownloading(true);
		setFailed(false);
		setProgress(0);
		const missing = videoUrls.filter((u) => !offline.has(u));
		await prefetchHosted(missing, (n) => setProgress(n));
		const updated = await cachedHosted(videoUrls);
		setOffline(updated);
		setFailed(updated.size < videoUrls.length);
		setDownloading(false);
	}

	return (
		<>
			<header className="sticky top-0 z-10 flex h-[calc(3rem+env(safe-area-inset-top))] items-center border-b border-line bg-bg px-4 pt-[env(safe-area-inset-top)]">
				<p className="flex-1 text-sm">
					<span className="font-semibold">Timer</span> Machine
				</p>
				{canFullscreen && (
					<button
						className="icon-btn -mr-4"
						aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
						onClick={toggleFullscreen}
					>
						<Icon name={isFullscreen ? 'shrink' : 'expand'} />
					</button>
				)}
			</header>

			<main className={`flex-1 ${EDITING_ENABLED ? 'pb-28' : 'pb-8'}`}>
				<h1 className="px-4 pb-6 pt-10 text-[42px] font-light leading-tight">Timers</h1>

				{videoUrls.length > 0 && (
					<div className="mx-4 mb-6 flex min-h-12 items-center gap-3 bg-surface pl-4">
						<p className="tabular min-w-0 flex-1 py-2 text-sm">
							{downloading ? (
								`Downloading videos… ${offline.size + progress} of ${videoUrls.length}`
							) : offline.size === videoUrls.length ? (
								`All ${videoUrls.length} videos available offline`
							) : (
								<>
									{offline.size} of {videoUrls.length} videos available offline
									{failed && (
										<span className="block text-bad">
											Some downloads failed. Check your connection and try again.
										</span>
									)}
								</>
							)}
						</p>
						{offline.size < videoUrls.length && (
							<button
								className="btn-ghost shrink-0 font-medium text-ink hover:text-accent"
								disabled={downloading}
								onClick={downloadAll}
							>
								{downloading ? 'Downloading' : 'Download all'}
							</button>
						)}
					</div>
				)}

				<ul className="border-t border-line">
					{allTimers.map((t) => (
						<li key={t.id} className="border-b border-line">
							<div className="flex items-stretch">
								<button
									className="min-w-0 flex-1 px-4 py-4 text-left hover:bg-surface"
									onClick={() => play(t.id)}
								>
									<h2 className="truncate text-xl">{t.name || 'Untitled timer'}</h2>
									<p className="mt-1 flex flex-wrap gap-x-4 text-sm text-muted">
										<span className="tabular text-ink">{formatDuration(timerDuration(t))}</span>
										<span>
											{stepCount(t)} {stepCount(t) === 1 ? 'step' : 'steps'}
										</span>
										{t.loop > 1 && <span>Repeats {t.loop}×</span>}
									</p>
									{/* one segment per item, width proportional to its duration */}
									<div className="mt-3 flex h-1 gap-px" aria-hidden="true">
										{t.items.map((item) => (
											<div
												key={item.id}
												className={item.kind === 'group' ? 'bg-ink' : 'bg-subtle'}
												style={{ flexGrow: Math.max(1, itemDuration(item)) }}
											/>
										))}
									</div>
								</button>
								<button
									className="grid w-16 shrink-0 place-items-center bg-accent text-white hover:bg-accent-hover active:bg-accent-pressed"
									aria-label={`Start ${t.name}`}
									onClick={() => play(t.id)}
								>
									<Icon name="play" fill size={24} />
								</button>
							</div>

							{EDITING_ENABLED && (
								<div className="flex border-t border-line text-sm">
									<button
										className="btn-ghost flex-1 justify-center"
										onClick={() => onNavigate(`/edit/${t.id}`)}
									>
										Edit
									</button>
									<button
										className="btn-ghost flex-1 justify-center"
										onClick={() => timers.duplicate(t.id)}
									>
										Duplicate
									</button>
									{confirmDelete === t.id ? (
										<button
											className="btn flex-1 justify-center bg-bad text-white"
											onClick={() => {
												timers.remove(t.id);
												setConfirmDelete(null);
											}}
										>
											Confirm delete
										</button>
									) : (
										<button
											className="btn-ghost flex-1 justify-center !text-bad"
											onClick={() => setConfirmDelete(t.id)}
										>
											Delete
										</button>
									)}
								</div>
							)}
						</li>
					))}
				</ul>
			</main>

			{EDITING_ENABLED && (
				<div className="fixed inset-x-0 bottom-0 mx-auto max-w-xl pb-[env(safe-area-inset-bottom)]">
					<button
						className="btn-primary h-16 w-full text-base"
						onClick={() => onNavigate('/edit/new')}
					>
						New timer <Icon name="plus" />
					</button>
				</div>
			)}
		</>
	);
}
