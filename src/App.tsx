import React, { useEffect, useState } from 'react';
import HomePage from './pages/HomePage';
import RunPage from './pages/RunPage';
import EditPage from './pages/EditPage';

type Route =
	| { page: 'home' }
	| { page: 'run'; id: string }
	| { page: 'edit'; id: string };

function parseRoute(): Route {
	if (typeof window === 'undefined') return { page: 'home' };

	const hash = window.location.hash;
	const path = hash.startsWith('#') ? hash.slice(1) : window.location.pathname;

	if (path.startsWith('/run/')) {
		const id = decodeURIComponent(path.slice('/run/'.length));
		return { page: 'run', id };
	}
	if (path.startsWith('/edit/')) {
		const id = decodeURIComponent(path.slice('/edit/'.length));
		return { page: 'edit', id };
	}
	return { page: 'home' };
}

export default function App() {
	const [route, setRoute] = useState<Route>(parseRoute);

	useEffect(() => {
		const handlePop = () => {
			setRoute(parseRoute());
		};
		window.addEventListener('popstate', handlePop);
		window.addEventListener('hashchange', handlePop);
		return () => {
			window.removeEventListener('popstate', handlePop);
			window.removeEventListener('hashchange', handlePop);
		};
	}, []);

	const navigate = (to: string) => {
		if (window.location.hash) {
			window.location.hash = to;
		} else {
			window.history.pushState(null, '', to);
		}
		setRoute(parseRoute());
		window.scrollTo(0, 0);
	};

	return (
		<div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
			{route.page === 'home' && <HomePage onNavigate={navigate} />}
			{route.page === 'run' && <RunPage timerId={route.id} onNavigate={navigate} />}
			{route.page === 'edit' && <EditPage timerId={route.id} onNavigate={navigate} />}
		</div>
	);
}
