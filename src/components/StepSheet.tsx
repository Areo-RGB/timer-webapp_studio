import React, { useEffect, useRef, useState } from 'react';
import type { Step } from '#lib/types';
import { saveMedia } from '#lib/media';
import DurationInput from './DurationInput';
import Icon from './Icon';

interface StepSheetProps {
	step: Step;
	title?: string;
	onsave: (step: Step) => void;
	onclose: () => void;
	ondelete?: () => void;
}

const options: { key: 'beep' | 'vibrate' | 'voice' | 'countdown' | 'halt'; label: string; hint: string }[] = [
	{ key: 'beep', label: 'Beep', hint: 'Sound when the step ends' },
	{ key: 'vibrate', label: 'Vibrate', hint: 'Buzz when the step ends' },
	{ key: 'voice', label: 'Announce', hint: 'Speak the step name when it starts' },
	{ key: 'countdown', label: 'Countdown', hint: 'Tick on the last 3 seconds' },
	{ key: 'halt', label: 'Wait for me', hint: 'Pause at the end until you tap continue' }
];

const mediaRows = [
	{ key: 'music', label: 'Music', accept: 'audio/*', hint: 'Plays while this step runs' },
	{ key: 'image', label: 'Image', accept: 'image/*', hint: 'Shown on the timer screen' },
	{ key: 'video', label: 'Video', accept: 'video/*', hint: 'Plays muted on the timer screen' }
] as const;

export default function StepSheet({
	step,
	title = 'Edit step',
	onsave,
	onclose,
	ondelete
}: StepSheetProps) {
	const dialogRef = useRef<HTMLDialogElement | null>(null);
	const [draft, setDraft] = useState<Step>(() => structuredClone(step));

	useEffect(() => {
		const dialog = dialogRef.current;
		if (dialog && !dialog.open) {
			dialog.showModal();
		}
	}, []);

	async function pick(key: (typeof mediaRows)[number]['key'], e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		e.target.value = '';
		if (!file) return;
		const ref = await saveMedia(file);
		setDraft((d) => {
			const next = { ...d, behaviours: { ...d.behaviours } };
			if (key === 'music') {
				next.behaviours.music = { ...ref, loop: true };
			} else {
				next.behaviours[key] = ref;
			}
			return next;
		});
	}

	function submit(e: React.FormEvent) {
		e.preventDefault();
		if (draft.length <= 0) return;
		onsave({ ...draft, label: draft.label.trim() || 'Step' });
	}

	return (
		<dialog
			ref={dialogRef}
			onClose={onclose}
			onClick={(e) => {
				if (e.target === dialogRef.current) {
					onclose();
				}
			}}
			className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-none border-t border-line bg-bg p-0 text-ink backdrop:bg-ink/50 sm:m-auto sm:max-w-md sm:rounded-none sm:border"
		>
			<form onSubmit={submit} className="space-y-6 p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
				<header className="flex items-center justify-between">
					<h2 className="text-xl">{title}</h2>
					<button type="button" className="icon-btn" aria-label="Close" onClick={onclose}>
						<Icon name="close" />
					</button>
				</header>

				<label className="block">
					<span className="mb-2 block text-xs text-muted">Step name</span>
					<input
						className="field"
						value={draft.label}
						onChange={(e) => setDraft({ ...draft, label: e.target.value })}
						placeholder="Step"
					/>
				</label>

				<DurationInput
					value={draft.length}
					onChange={(val) => setDraft({ ...draft, length: val })}
				/>

				<fieldset className="space-y-1">
					<legend className="mb-2 text-sm text-muted">When this step runs</legend>
					{options.map((o) => (
						<label
							key={o.key}
							className="flex cursor-pointer items-center gap-3 border-b border-line py-3"
						>
							<span className="flex-1">
								<span className="block">{o.label}</span>
								<span className="block text-sm text-muted">{o.hint}</span>
							</span>
							<input
								type="checkbox"
								className="peer sr-only"
								checked={!!draft.behaviours[o.key]}
								onChange={(e) =>
									setDraft({
										...draft,
										behaviours: { ...draft.behaviours, [o.key]: e.target.checked }
									})
								}
							/>
							<span className="relative h-6 w-12 shrink-0 rounded-full bg-subtle transition peer-checked:bg-accent after:absolute after:left-[3px] after:top-[3px] after:size-[18px] after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
						</label>
					))}
				</fieldset>

				<fieldset>
					<legend className="mb-2 text-sm text-muted">Media</legend>
					{mediaRows.map((m) => {
						const ref = draft.behaviours[m.key];
						return (
							<React.Fragment key={m.key}>
								<div className="flex min-h-14 items-center gap-3 border-b border-line">
									<span className="min-w-0 flex-1 py-2">
										<span className="block">{m.label}</span>
										<span className="block truncate text-sm text-muted">
											{ref ? ref.name : m.hint}
										</span>
									</span>
									{ref ? (
										<button
											type="button"
											className="btn-ghost !text-bad"
											onClick={() =>
												setDraft({
													...draft,
													behaviours: { ...draft.behaviours, [m.key]: undefined }
												})
											}
										>
											Remove
										</button>
									) : (
										<label className="btn-ghost cursor-pointer">
											Choose file
											<input
												type="file"
												accept={m.accept}
												className="sr-only"
												onChange={(e) => pick(m.key, e)}
											/>
										</label>
									)}
								</div>
								{m.key === 'music' && draft.behaviours.music && (
									<label className="flex min-h-12 cursor-pointer items-center gap-3 border-b border-line pl-4">
										<span className="flex-1 text-sm">Loop music until the step ends</span>
										<input
											type="checkbox"
											className="peer sr-only"
											checked={draft.behaviours.music.loop}
											onChange={(e) =>
												setDraft({
													...draft,
													behaviours: {
														...draft.behaviours,
														music: { ...draft.behaviours.music!, loop: e.target.checked }
													}
												})
											}
										/>
										<span className="relative h-6 w-12 shrink-0 rounded-full bg-subtle transition peer-checked:bg-accent after:absolute after:left-[3px] after:top-[3px] after:size-[18px] after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-6" />
									</label>
								)}
							</React.Fragment>
						);
					})}
				</fieldset>

				<div className="-mx-4 -mb-4 grid grid-cols-2 gap-px pb-[env(safe-area-inset-bottom)]">
					{ondelete ? (
						<button
							type="button"
							className="btn h-16 bg-bad text-white hover:bg-bad-hover"
							onClick={ondelete}
						>
							Delete <Icon name="trash" size={16} />
						</button>
					) : (
						<button type="button" className="btn-secondary h-16" onClick={onclose}>
							Cancel
						</button>
					)}
					<button
						type="submit"
						className="btn-primary h-16"
						disabled={draft.length <= 0}
					>
						Save step <Icon name="check" size={16} />
					</button>
				</div>
			</form>
		</dialog>
	);
}
