import { defineConfig } from 'tsup'

const isProd = process.env.NODE_ENV === 'production'

export default defineConfig({
	entry: ['src/main.ts'],
	outDir: 'dist',
	target: 'node20',
	platform: 'node',
	format: ['esm'],
	splitting: false,
	sourcemap: true,
	minify: isProd,
	treeshake: true,
	clean: true,
	// noExternal: [/^.*$/],
	tsconfig: 'tsconfig.json',
	env: {
		NODE_ENV: process.env.NODE_ENV || 'development',
	},
})
