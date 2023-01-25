import { sveltekit } from '@sveltejs/kit/vite';
import type { UserConfig } from 'vite';
import path from 'node:path';

const config: UserConfig = {
	plugins: [sveltekit()],
	resolve: {
		alias: {
			'@gitroot': path.resolve('../../')
		}
	}
};

export default config;
