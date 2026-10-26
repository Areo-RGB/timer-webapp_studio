import React, { useState } from 'react';
import Icon from '../components/Icon';
import StepSheet from '../components/StepSheet';
import Stepper from '../components/Stepper';
import SwipeRow from '../components/SwipeRow';
import { unlockAudio } from '#lib/feedback';
import { timers } from '#lib/timers';
import {
	formatDuration,
	itemDuration,
	newGroup,
	newStep,
	newTimer,
	timerDuration,
	type Group,
	type Step,
	type Timer
} from '#lib/types';

interface EditPageProps {
	timerId: string;
	onNavigate: (path: string) => void;
}

type Editing = {
	step: Step;
	title: string;
	set: (s: Step) => void;
	remove?: () => void;
};

export default function EditPage({ timerId, onNavigate }: EditPageProps) {
	const existing = timers.get(timerId);
	const [timer, setTimer] = useState<Timer>(() =>
		existing ? (structuredClone(existing) as Timer) : newTimer()
	);
	const [editing, setEditing] = useState<Editing | null>(null);

	function updateTimer(updater: (prev: Timer) => Timer) {
		setTimer((prev) => updater(structuredClone(prev)));
	}

	function move<T>(list: T[], i: number, dir: -1 | 1) {
		const j = i + dir;
		if (j < 0 || j >= list.length) return;
		const next = [...list];
		[next[i], next[j]] = [next[j], next[i]];
		return next;
	}

	function editTopStep(i: number) {
		const s = timer.items[i] as Step;
		setEditing({
			step: s,
			title: 'Edit step',
			set: (v) =>
				updateTimer((t) => {
					t.items[i] = v;
					return t;
				}),
			remove: () =>
				updateTimer((t) => {
					t.items.splice(i, 1);
					return t;
				})
		});
	}

	function editGroupStep(groupIndex: number, stepIndex: number) {
		const g = timer.items[groupIndex] as Group;
		setEditing({
			step: g.steps[stepIndex],
			title: `Edit step in ${g.name}`,
			set: (v) =>
				updateTimer((t) => {
					const grp = t.items[groupIndex] as Group;
					grp.steps[stepIndex] = v;
					return t;
				}),
			remove:
				g.steps.length > 1
					? () =>
							updateTimer((t) => {
								const grp = t.items[groupIndex] as Group;
								grp.steps.splice(stepIndex, 1);
								return t;
							})
					: undefined
		});
	}

	function addStep() {
		const s = newStep(`Step ${timer.items.length + 1}`);
		setEditing({
			step: s,
			title: 'New step',
			set: (v) =>
				updateTimer((t) => {
					t.items.push(v);
					return t;
				})
		});
	}

	function addGroupStep(groupIndex: number) {
		const g = timer.items[groupIndex] as Group;
		setEditing({
			step: newStep(),
			title: `New step in ${g.name}`,
			set: (v) =>
				updateTimer((t) => {
					const grp = t.items[groupIndex] as Group;
					grp.steps.push(v);
					return t;
				})
		});
	}

	function editSpecial(which: 'startStep' | 'endStep') {
		const s = timer[which] ?? newStep(which === 'startStep' ? 'Get ready' : 'Cool down', 10_000);
		setEditing({
			step: s,
			title: which === 'startStep' ? 'Start step' : 'End step',
			set: (v) =>
				updateTimer((t) => {
					t[which] = v;
					return t;
				}),
			remove: timer[which]
				? () =>
						updateTimer((t) => {
							t[which] = null;
							return t;
						})
				: undefined
		});
	}

	function save(then: 'list' | 'run') {
		const toSave = { ...timer, name: timer.name.trim() || 'Untitled timer' };
		timers.save(toSave);
		if (then === 'run') {
			unlockAudio();
			onNavigate(`/run/${toSave.id}`);
		} else {
			onNavigate('/');
		}
	}

	const renderStepRow = (
		s: Step,
		onedit: () => void,
		onup?: () => void,
		ondown?: () => void,
		onremove?: () => void
	) => (
		<SwipeRow onRemove={onremove}>
			<button
				type="button"
				className="flex min-h-12 min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left hover:bg-surface-2"
				onClick={onedit}
			>
				<span className="min-w-0 flex-1 truncate">{s.label}</span>
				{s.behaviours.halt && <span className="text-xs text-muted">Waits</span>}
				<span className="tabular">{formatDuration(s.length)}</span>
			</button>
			{onup && (
				<>
					<button
						type="button"
						className="icon-btn border-l border-line"
						aria-label="Move up"
						onClick={onup}
					>
						<Icon name="up" size={16} />
					</button>
					<button
						type="button"
						className="icon-btn"
						aria-label="Move down"
						onClick={ondown}
					>
						<Icon name="down" size={16} />
					</button>
				</>
			)}
		</SwipeRow>
	);

	const renderSpecial = (which: 'startStep' | 'endStep', label: string) => {
		const s = timer[which];
		return (
			<section>
				<h2 className="mb-2 text-sm text-muted">{label}</h2>
				{s ? (
					renderStepRow(
						s,
						() => editSpecial(which),
						undefined,
						undefined,
						() => updateTimer((t) => ({ ...t, [which]: null }))
					)
				) : (
					<button
						type="button"
						className="btn-ghost w-full border border-dashed border-line"
						onClick={() => editSpecial(which)}
					>
						Add {label.toLowerCase()} <Icon name="plus" size={16} />
					</button>
				)}
			</section>
		);
	};

	return (
		<>
			<header className="sticky top-0 z-10 flex h-[calc(3rem+env(safe-area-inset-top))] items-center border-b border-line bg-bg pt-[env(safe-area-inset-top)]">
				<button
					type="button"
					onClick={() => onNavigate('/')}
					className="icon-btn"
					aria-label="Back to timers"
				>
					<Icon name="back" />
				</button>
				<p className="flex-1 text-sm">{existing ? 'Edit timer' : 'New timer'}</p>
				<button type="button" className="btn-ghost" onClick={() => save('list')}>
					Save
				</button>
			</header>

			<main className="flex-1 space-y-8 px-4 pb-32 pt-6">
				<label className="block">
					<span className="mb-2 block text-xs text-muted">Timer name</span>
					<input
						className="field !text-[32px] !font-light leading-tight"
						value={timer.name}
						onChange={(e) => updateTimer((t) => ({ ...t, name: e.target.value }))}
						placeholder="Untitled timer"
					/>
				</label>

				<div className="flex items-center justify-between gap-4 border-y border-line py-3">
					<div>
						<p>Repeat whole timer</p>
						<p className="tabular text-sm text-muted">
							Total {formatDuration(timerDuration(timer))}
						</p>
					</div>
					<Stepper
						value={timer.loop}
						onChange={(val) => updateTimer((t) => ({ ...t, loop: val }))}
						label="timer loops"
					/>
				</div>

				{renderSpecial('startStep', 'Start step')}

				<section>
					<h2 className="mb-2 text-sm text-muted">
						Steps <span className="text-subtle">· swipe a step sideways to remove it</span>
					</h2>
					<div className="space-y-4">
						{timer.items.length === 0 ? (
							<p className="bg-surface px-4 py-8 text-muted">
								This timer has no steps. Add a step or a repeating group.
							</p>
						) : (
							timer.items.map((item, i) => {
								if (item.kind === 'step') {
									return (
										<div key={item.id} className="border-t border-line">
											{renderStepRow(
												item,
												() => editTopStep(i),
												() =>
													updateTimer((t) => {
														const next = move(t.items, i, -1);
														if (next) t.items = next;
														return t;
													}),
												() =>
													updateTimer((t) => {
														const next = move(t.items, i, 1);
														if (next) t.items = next;
														return t;
													}),
												() =>
													updateTimer((t) => {
														t.items.splice(i, 1);
														return t;
													})
											)}
										</div>
									);
								} else {
									return (
										<div key={item.id} className="border-l-4 border-ink">
											<div className="flex items-center gap-2 bg-ink py-1 pl-4 pr-1 text-white">
												<input
													className="min-w-0 flex-1 bg-transparent py-2 outline-none"
													value={item.name}
													onChange={(e) =>
														updateTimer((t) => {
															(t.items[i] as Group).name = e.target.value;
															return t;
														})
													}
													aria-label="Group name"
												/>
												<Stepper
													value={item.loop}
													onChange={(val) =>
														updateTimer((t) => {
															(t.items[i] as Group).loop = val;
															return t;
														})
													}
													label="group loops"
													dark
												/>
											</div>
											{item.steps.map((s, j) => (
												<React.Fragment key={s.id}>
													{renderStepRow(
														s,
														() => editGroupStep(i, j),
														() =>
															updateTimer((t) => {
																const grp = t.items[i] as Group;
																const next = move(grp.steps, j, -1);
																if (next) grp.steps = next;
																return t;
															}),
														() =>
															updateTimer((t) => {
																const grp = t.items[i] as Group;
																const next = move(grp.steps, j, 1);
																if (next) grp.steps = next;
																return t;
															}),
														item.steps.length > 1
															? () =>
																	updateTimer((t) => {
																		const grp = t.items[i] as Group;
																		grp.steps.splice(j, 1);
																		return t;
																	})
															: undefined
													)}
												</React.Fragment>
											))}
											<div className="flex items-center bg-surface text-sm">
												<button
													type="button"
													className="btn-ghost flex-1"
													onClick={() => addGroupStep(i)}
												>
													Add step <Icon name="plus" size={16} />
												</button>
												<span className="tabular px-2 text-muted">
													{formatDuration(itemDuration(item))}
												</span>
												<button
													type="button"
													className="icon-btn"
													aria-label="Move group up"
													onClick={() =>
														updateTimer((t) => {
															const next = move(t.items, i, -1);
															if (next) t.items = next;
															return t;
														})
													}
												>
													<Icon name="up" size={16} />
												</button>
												<button
													type="button"
													className="icon-btn"
													aria-label="Move group down"
													onClick={() =>
														updateTimer((t) => {
															const next = move(t.items, i, 1);
															if (next) t.items = next;
															return t;
														})
													}
												>
													<Icon name="down" size={16} />
												</button>
												<button
													type="button"
													className="icon-btn hover:text-bad"
													aria-label="Delete group"
													onClick={() =>
														updateTimer((t) => {
															t.items.splice(i, 1);
															return t;
														})
													}
												>
													<Icon name="trash" size={16} />
												</button>
											</div>
										</div>
									);
								}
							})
						)}
					</div>
					<div className="mt-4 grid grid-cols-2 gap-px">
						<button type="button" className="btn-secondary" onClick={addStep}>
							Add step <Icon name="plus" size={16} />
						</button>
						<button
							type="button"
							className="btn-secondary"
							onClick={() =>
								updateTimer((t) => {
									t.items.push(newGroup());
									return t;
								})
							}
						>
							Add group <Icon name="repeat" size={16} />
						</button>
					</div>
				</section>

				{renderSpecial('endStep', 'End step')}
			</main>

			<div className="fixed inset-x-0 bottom-0 mx-auto max-w-xl border-t border-line bg-bg pb-[env(safe-area-inset-bottom)]">
				<button
					type="button"
					className="btn-primary h-16 w-full text-base"
					disabled={timer.items.length === 0}
					onClick={() => save('run')}
				>
					Save and start <Icon name="play" fill />
				</button>
			</div>

			{editing && (
				<StepSheet
					step={editing.step}
					title={editing.title}
					onclose={() => setEditing(null)}
					onsave={(s) => {
						editing.set(s);
						setEditing(null);
					}}
					ondelete={
						editing.remove
							? () => {
									editing.remove?.();
									setEditing(null);
								}
							: undefined
					}
				/>
			)}
		</>
	);
}
