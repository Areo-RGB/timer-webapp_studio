import type { Timer } from './types';

/** Media files (music, images, videos) are too large for localStorage, so they live in IndexedDB. */

export interface MediaRef {
	id: string;
	name: string;
	/** Hosted file (e.g. a built-in drill clip); otherwise the file is in IndexedDB under `id`. */
	url?: string;
	/** Video only: play with sound. User-picked videos default to muted. */
	sound?: boolean;
}

const DB = 'timer-webapp';
const STORE = 'media';

let dbp: Promise<IDBDatabase> | null = null;

function db() {
	dbp ??= new Promise((resolve, reject) => {
		const req = indexedDB.open(DB, 1);
		req.onupgradeneeded = () => req.result.createObjectStore(STORE);
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
	return dbp;
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) {
	return db().then(
		(d) =>
			new Promise<T>((resolve, reject) => {
				const req = fn(d.transaction(STORE, mode).objectStore(STORE));
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			})
	);
}

export async function saveMedia(file: File): Promise<MediaRef> {
	const id = crypto.randomUUID();
	await run('readwrite', (s) => s.put(file, id));
	return { id, name: file.name };
}

const urls = new Map<string, Promise<string | null>>();

/** Playable URL for a media ref: the hosted URL, or an object URL for a stored file. */
export function mediaUrl(ref: MediaRef) {
	if (ref.url) return Promise.resolve(ref.url);
	const id = ref.id;
	let p = urls.get(id);
	if (!p) {
		p = run<Blob | undefined>('readonly', (s) => s.get(id)).then((b) =>
			b ? URL.createObjectURL(b) : null
		);
		urls.set(id, p);
	}
	return p;
}

/**
 * Downloads hosted media in full so the service worker caches it for offline use.
 * Calls `onprogress` with how many of the files are done.
 */
export async function prefetchHosted(urls: string[], onprogress: (done: number) => void) {
	let done = 0;
	for (const url of urls) {
		try {
			const res = await fetch(url);
			await res.arrayBuffer();
		} catch {
			/* offline or missing: the player falls back to whatever is cached */
		}
		onprogress(++done);
	}
}

/** Which of the given hosted URLs the service worker already has cached (cache name set in vite.config.ts). */
export async function cachedHosted(urls: string[]): Promise<Set<string>> {
	const done = new Set<string>();
	if (!('caches' in window)) return done;
	const cache = await caches.open('clips');
	for (const url of urls) if (await cache.match(url)) done.add(url);
	return done;
}

/** Every hosted file of the given kinds referenced by the given timers' steps. */
export function hostedUrls(
	timers: Timer[],
	kinds: ('video' | 'image' | 'music')[] = ['video', 'image', 'music']
): string[] {
	const steps = timers.flatMap((t) => [
		...(t.startStep ? [t.startStep] : []),
		...t.items.flatMap((i) => (i.kind === 'group' ? i.steps : [i])),
		...(t.endStep ? [t.endStep] : [])
	]);
	const urls = steps.flatMap((s) => kinds.map((k) => s.behaviours[k]?.url));
	return [...new Set(urls.filter((u): u is string => !!u))];
}
