// welcome.ts
/* eslint-disable no-console */

import { configTypes } from '@/core' // <- anpassen

type WelcomeOptions = {
	name?: string
	version?: string
	host?: string // z.B. "localhost" oder "0.0.0.0"
	protocol?: 'http' | 'https'
	startedAt?: Date
	showAllEndpoints?: boolean // bei vielen Endpoints ggf. begrenzen
}

export function printWelcome(cfg: configTypes.Config, opts: WelcomeOptions = {}): void {
	const termWidth = Math.min(Math.max(process.stdout.columns ?? 80, 80), 140)
	const name = opts.name ?? 'App'
	const version = opts.version ?? ''
	const protocol = opts.protocol ?? 'http'
	const host = opts.host ?? 'localhost'
	const startedAt = opts.startedAt ?? new Date()
	const showAllEndpoints = opts.showAllEndpoints ?? true

	const color = makeColorizer()
	const line = (char = '─') => char.repeat(termWidth - 2)

	const url = `${protocol}://${host}:${cfg.server.port}`
	const endpointsEnabled = cfg.endpoints?.filter((e) => e.enable) ?? []
	const endpointsDisabled = cfg.endpoints?.filter((e) => !e.enable) ?? []
	const endpointsToShow = showAllEndpoints ? endpointsEnabled : endpointsEnabled.slice(0, 12)
	const moreEndpoints = endpointsEnabled.length - endpointsToShow.length

	const sections: string[] = []

	// HEADER
	sections.push(
		box(
			[
				`${color.bold('🚀  ' + name)}${version ? color.dim(`  v${version}`) : ''}`,
				`${color.cyan(url)}  ${color.dim('→ root:')} ${truncate(cfg.server.root, 60)}`,
				`${color.dim('started:')} ${startedAt.toLocaleString()}`,
			],
			{ width: termWidth, title: 'Welcome' },
		),
	)

	// FEATURES / SWITCHES
	const featRows: [string, string][] = [
		['heartbeat', bool(cfg.server.locations.heartbeat, color)],
		['endpoints', bool(cfg.server.locations.endpoints, color)],
		['filesystem', bool(cfg.server.locations.filesystem, color)],
		['resolve_extension', bool(cfg.filesystem.resolve_extension, color)],
		['modifier', bool(cfg.modifier.enable, color) + modulesSuffix(cfg.modifier.modules)],
		['formatter.default', code(cfg.formatter.default, color)],
	]
	sections.push(kvTable('Features', featRows, termWidth, color))

	// TIMEOUTS
	const t = cfg.server.timeouts
	const timeoutRows: [string, string][] = [
		['socket', ms(t.socket)],
		['keepAlive', ms(t.keepAlive)],
		['headers', ms(t.headers)],
		['request', ms(t.request)],
		['maxReq/Socket', String(cfg.server.maxRequestsPerSocket)],
	]
	sections.push(kvTable('Timeouts', timeoutRows, termWidth, color))

	// AUTH
	const a = cfg.auth
	const authRows: [string, string][] = [
		['enabled', bool(a.enable, color)],
		['realm', orDash(a.oauth2.realm, color)],
		['issuer', orDash(a.oauth2.issuerUri, color)],
		['jwks', orDash(a.oauth2.jwksUri, color)],
		['audience', orDash(a.oauth2.audience, color)],
	]
	sections.push(kvTable('Auth (OAuth2)', authRows, termWidth, color))

	// LOGGING (app + http)
	sections.push(kvTable('Logging · app', logRows(cfg.logging.app, color), termWidth, color))
	sections.push(kvTable('Logging · http', logRows(cfg.logging.http, color), termWidth, color))

	// ENDPOINTS
	const endpointLines = endpointsToShow.length
		? endpointsToShow.map((e) => {
				const fmt = e.format ? code(e.format, color) : color.dim('(auto)')
				const file = truncate(e.file, 54)
				return ` ${color.green('●')}  ${color.bold(e.path)}  ${color.dim('→')} ${file}  ${color.dim('format:')} ${fmt}`
			})
		: [color.dim(' (keine aktiven Endpoints)')]

	if (moreEndpoints > 0) {
		endpointLines.push(color.dim(` … und ${moreEndpoints} weitere`))
	}
	endpointLines.push(color.dim(` disabled: ${endpointsDisabled.length}`))
	sections.push(box(endpointLines, { width: termWidth, title: 'Endpoints' }))

	// FOOTER
	const footer = [
		`${color.dim('Press')} ${code('Ctrl+C', color)} ${color.dim('to stop · Happy shipping!')} ✨`,
	]
	sections.push(box(footer, { width: termWidth, title: ' ' }))

	// OUTPUT
	const bannerTop =
		color.magenta('┌' + line('─') + '┐') +
		'\n' +
		color.magenta('│') +
		center(`${name}${version ? ` v${version}` : ''}`, termWidth - 2) +
		color.magenta('│') +
		'\n' +
		color.magenta('└' + line('─') + '┘')

	console.log('\n' + bannerTop + '\n' + sections.join('\n') + '\n')
}

/* ------------------------------ helpers --------------------------------- */

function makeColorizer() {
	const useColor = process.stdout.isTTY ?? true
	const wrap = (code: number) => (s: string) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s)
	return {
		bold: wrap(1),
		dim: wrap(2),
		red: wrap(31),
		green: wrap(32),
		yellow: wrap(33),
		blue: wrap(34),
		magenta: wrap(35),
		cyan: wrap(36),
		gray: wrap(90),
		// semantic shortcuts
		ok: (s: string) => wrap(32)(s),
		warn: (s: string) => wrap(33)(s),
		err: (s: string) => wrap(31)(s),
	}
}

function bool(v: boolean, c = makeColorizer()) {
	return v ? c.ok('enabled ✓') : c.gray('disabled ✕')
}

function code(s: string, c = makeColorizer()) {
	return c.cyan(s ? `\`${s}\`` : '—')
}

function orDash(s: string | null, c = makeColorizer()) {
	return s ? c.cyan(s) : c.gray('—')
}

function ms(n: number) {
	if (n < 1000) return `${n} ms`
	const sec = (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)
	return `${sec} s`
}

function modulesSuffix(mods: Record<string, boolean> | undefined) {
	if (!mods) return ''
	const enabled = Object.entries(mods)
		.filter(([, on]) => on)
		.map(([k]) => k)
	const disabled = Object.entries(mods)
		.filter(([, on]) => !on)
		.map(([k]) => k)
	const parts: string[] = []
	if (enabled.length) parts.push(`(${enabled.length} on: ${enabled.join(', ')})`)
	if (disabled.length)
		parts.push(makeColorizer().gray(`(${disabled.length} off: ${disabled.join(', ')})`))
	return parts.length ? ' ' + parts.join(' ') : ''
}

function kvTable(title: string, rows: [string, string][], width: number, c = makeColorizer()) {
	const keyWidth = Math.min(
		Math.max(...rows.map(([k]) => k.length), title.length) + 2,
		Math.floor(width * 0.45),
	)
	const lines = rows.map(([k, v]) => ` ${c.gray(padRight(k + ':', keyWidth))} ${v}`)
	return box(lines, { width, title })
}

function logRows(
	sect: {
		enable: boolean
		level: string
		stdout: boolean
		file: string | null
		logrotation: {
			size?: string
			frequency?: string
			limit?: number
			extension?: string
			dateFormat?: string
			symlink?: boolean
		}
	},
	c = makeColorizer(),
): [string, string][] {
	const out: string[] = []
	if (sect.stdout) out.push('stdout')
	if (sect.file) out.push(`file:${sect.file}`)
	if (!out.length) out.push('—')
	const rot = sect.file
		? Object.entries(sect.logrotation ?? {})
				.filter(([, v]) => v !== undefined && v !== null)
				.map(([k, v]) => `${k}=${v}`)
				.join(', ')
		: ''
	return [
		['enabled', bool(sect.enable, c)],
		['level', code(String(sect.level), c)],
		['output', out.map((s) => code(s, c)).join(c.gray(', '))],
		...(rot ? ([['rotation', c.dim(rot)]] as [string, string][]) : []),
	]
}

function box(lines: string[], opts: { width: number; title?: string }) {
	const w = opts.width
	const c = makeColorizer()
	const title = opts.title?.trim() ?? ''
	const top =
		c.magenta('┌') +
		c.magenta('─') +
		(title ? c.magenta(' ') + c.bold(title) + ' ' : '') +
		c.magenta('─'.repeat(Math.max(0, w - 4 - (title ? title.length + 2 : 0)))) +
		c.magenta('┐')
	const body = lines
		.map((l) => c.magenta('│') + ' ' + padRight(stripAnsi(l), w - 4) + ' ' + c.magenta('│'))
		.join('\n')
	const bottom = c.magenta('└' + '─'.repeat(w - 2) + '┘')
	return [top, body, bottom].join('\n')
}

function truncate(s: string, max: number) {
	return s.length <= max ? s : s.slice(0, Math.max(0, max - 1)) + '…'
}

function padRight(s: string, width: number) {
	return s.padEnd(width, ' ')
}

function center(s: string, width: number) {
	const len = stripAnsi(s).length
	if (len >= width) return s
	const left = Math.floor((width - len) / 2)
	const right = width - len - left
	return ' '.repeat(left) + s + ' '.repeat(right)
}

function stripAnsi(s: string) {
	return s.replace(/\x1B\[[0-9;]*m/g, '')
}
