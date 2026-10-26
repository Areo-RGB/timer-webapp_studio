import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
	plugins: [
		tailwindcss(),
		react()
	],
	resolve: {
		alias: {
			'#lib': fileURLToPath(new URL('./src/lib', import.meta.url))
		}
	},
	server: {
		host: '0.0.0.0',
		port: 3000
	}
});
