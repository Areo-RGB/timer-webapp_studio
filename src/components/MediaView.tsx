import React, { useEffect, useRef, useState } from 'react';
import { mediaUrl, type MediaRef } from '#lib/media';
import Icon from './Icon';

interface MediaViewProps {
	media: MediaRef;
	kind: 'image' | 'video';
	playing: boolean;
	muted?: boolean;
	rate?: number;
}

export default function MediaView({
	media,
	kind,
	playing,
	muted = false,
	rate = 1
}: MediaViewProps) {
	const [src, setSrc] = useState<string | null>(null);
	const [hasError, setHasError] = useState(false);
	const videoRef = useRef<HTMLVideoElement | null>(null);

	useEffect(() => {
		let cancelled = false;
		setHasError(false);
		mediaUrl(media).then((url) => {
			if (!cancelled) setSrc(url);
		});
		return () => {
			cancelled = true;
		};
	}, [media]);

	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;
		video.playbackRate = rate;
		if (playing) {
			void video.play().catch(() => {});
		} else {
			video.pause();
		}
	}, [playing, rate, src]);

	if (hasError) {
		return (
			<div className="flex size-full flex-col items-center justify-center bg-ink p-6 text-center text-white">
				<Icon name="play" size={36} className="mb-2 text-subtle" />
				<p className="text-base font-medium">{media.name}</p>
				<p className="mt-1 text-xs text-subtle">Video preview</p>
			</div>
		);
	}

	if (!src) return <div className="size-full bg-ink animate-pulse" />;

	if (kind === 'image') {
		return (
			<img
				src={src}
				alt={media.name}
				className="size-full object-contain"
				onError={() => setHasError(true)}
			/>
		);
	}

	return (
		<video
			ref={videoRef}
			src={src}
			onLoadedMetadata={(e) => {
				e.currentTarget.playbackRate = rate;
			}}
			onError={() => setHasError(true)}
			className="size-full object-contain"
			loop
			muted={muted || !media.sound}
			playsInline
		/>
	);
}
