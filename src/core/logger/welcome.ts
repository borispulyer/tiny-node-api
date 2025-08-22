/*
 * Imports
 */
import pkg from '@/../package.json' assert { type: 'json' }
import * as Parser from '@/parser'
import * as Modifier from '@/modifier'
import * as Formatter from '@/formatter'
import { config } from '@/core'

export function print() {
	// Definitions
	const line = '─'.repeat(60)
	const parsers = Parser.getModules()
	const modifiers = Modifier.getModules()
	const formatters = Formatter.getModules()
	
	// Start
	// console.clear()
	console.log(line)
	console.log(` 🚀  Starting ${pkg.name}`)
	console.log(`     v${pkg.version}`)
	console.log(line)
	console.log()

	// Server
	console.log(` 🌐  Server`)
	console.log(`      • Port:                 ${config.server.port}`)
	console.log(`      • Directories:`)
	console.log(`         - Public:            ${parseString(config.server.path.public)}`)
	console.log(`         - Filter:            ${parseString(config.server.path.filter)}`)
	console.log(`      • Timeouts:`)
	console.log(`         - Socket:            ${config.server.timeouts.socket.toLocaleString()} ms`)
	console.log(`         - KeepAlive:         ${config.server.timeouts.keepAlive.toLocaleString()} ms`)
	console.log(`         - Headers:           ${config.server.timeouts.headers.toLocaleString()} ms`)
	console.log(`         - Request:           ${config.server.timeouts.request.toLocaleString()} ms`)
	console.log(`      • MaxReq/Sock:          ${config.server.maxRequestsPerSocket.toLocaleString()}`)
	console.log(`      • Registered location modules:`)
	console.log(`         - Heartbeat:         ${parseBool2Enabled(config.server.locations.heartbeat)}`)
	console.log(`         - Endpoints:         ${parseBool2Enabled(config.server.locations.endpoints)}`)
	console.log(`         - Filesystem:        ${parseBool2Enabled(config.server.locations.filesystem)}`)
	console.log()

	// Authentication
	console.log(` 🔐  Authentication`)
	console.log(`      • Enabled:              ${parseBool2Enabled(config.auth.enable)}`)
	if (config.auth.enable) {
		console.log(`      • Realm:                ${parseString(config.auth.oauth2.realm)}`)
		console.log(`      • Issuer:               ${parseString(config.auth.oauth2.issuerUri)}`)
		console.log(`      • JWKS:                 ${parseString(config.auth.oauth2.jwksUri)}`)
		console.log(`      • Audience:             ${parseString(config.auth.oauth2.audience)}`)
	}
	console.log()
	
	// Heartbeat
	if (config.server.locations.heartbeat) {
		console.log(` 💗  Heartbeat`)
		console.log(`      • ${config.server.locations.heartbeat ? '✅' : '❌'}  /_heartbeat   →  ❤`)
		console.log()
	}

	// Filesystem
	if (config.server.locations.filesystem) {
		console.log(` 📁  Filesystem`)
		console.log(`      • Resolve Extensions   ${parseBool2Enabled(config.filesystem.resolve_extension)}`)
		console.log(`      • ${parseBool(config.server.locations.filesystem)}  /             →  ${config.server.path.public}`)
		console.log()
	}

	// Endpoints
	if (config.server.locations.endpoints) {
		console.log(` 📡  Endpoints`)
		if ( config.endpoints.length > 0) {
			for (const endpoint of config.endpoints) {
				console.log(`      • ${endpoint.enable ? '✅' : '❌'}  ${endpoint.path}  →  ${endpoint.filter ?? '<no filter>'}  →  ${endpoint.file} (${endpoint.format ?? '-'})`)
			}
		} else {
				console.log(`      • ❌  None`)
		}
		console.log()
	}

	console.log(line)
	console.log()

	// Parsers
	console.log(` 🛠️   Parsers`)
	console.log(`      • Registered Parsers and file extensions:`)
	if (parsers.length > 0) {
		for (const parser of parsers) {
			console.log(`         - ${parser.id}: ${parser.extensions.map((value) => `.${value}`).join(', ')}`)
		}
	} else {
			console.log(`         - ❌  None`)
	}
	console.log()
	
	// Modifiers
	console.log(` 🛠️   Modifiers`)
	console.log(`      • Enabled:              ${parseBool2Enabled(config.modifier.enable)}`)
	console.log(`      • Registered Modifiers:`)
	if (modifiers.length > 0) {
		for (const modifier of modifiers) {
			console.log(`         - ${config.modifier.modules[modifier.id] ? '✅' : '❌'} ${modifier.selector}`)
		}
	} else {
			console.log(`         - ❌  None`)
	}
	console.log()
	
	// Formatter
	console.log(` 🛠️   Formatters`)
	console.log(`      • Default format:       ${config.formatter.default}`)
	console.log(`      • Registered Formatters and file extensions:`)
	if ( formatters.length > 0) {
		for (const formatter of formatters) {
			console.log(`         - ${formatter.id}: ${formatter.selectors.map((value) => `.${value}`).join(', ')}`)
		}
	} else {
			console.log(`         - ❌  None`)
	}
	console.log()

	console.log(line)
	console.log()

	// Logging
	console.log(` 📝  Logging`)
	console.log(`     • HTTP access:`)
	console.log(`         - Enabled:           ${parseBool2Enabled(config.logging.http.enable)}`)
	console.log(`         - Log to stdout:     ${parseBool(config.logging.http.stdout.enable)} ${parseString(config.logging.http.stdout.level.toUpperCase())}`)
	console.log(`         - Log to file:       ${parseBool(config.logging.http.filesystem.enable)} ${parseString(config.logging.http.filesystem.level.toUpperCase())}`)
	console.log(`         - File:              ${parseString(config.logging.http.filesystem.file)}`)
	console.log(`         - Max. filesize:     ${parseString(config.logging.http.filesystem.logrotation.size)}`)
	console.log(`         - Max. files:        ${config.logging.http.filesystem.logrotation.limit?.toLocaleString()}`)
	console.log(`         - Rotation freq.:    ${parseString(config.logging.http.filesystem.logrotation.frequency?.toUpperCase())}`)
	console.log(`         - File ext.:         ${parseString(config.logging.http.filesystem.logrotation.extension)}`)
	console.log(`         - File dateformat:   ${parseString(config.logging.http.filesystem.logrotation.dateFormat)}`)
	console.log(`         - Create symlink:    ${parseBool2Enabled(config.logging.http.filesystem.logrotation.symlink)}`)
	console.log(`     • App:`)
	console.log(`         - Enabled:           ${parseBool2Enabled(config.logging.app.enable)}`)
	console.log(`         - Log to stdout:     ${parseBool(config.logging.app.stdout.enable)} ${parseString(config.logging.app.stdout.level.toUpperCase())}`)
	console.log(`         - Log to file:       ${parseBool(config.logging.app.filesystem.enable)} ${parseString(config.logging.app.filesystem.level.toUpperCase())}`)
	console.log(`         - File:              ${parseString(config.logging.app.filesystem.file)}`)
	console.log(`         - Max. filesize:     ${parseString(config.logging.app.filesystem.logrotation.size)}`)
	console.log(`         - Max. files:        ${config.logging.app.filesystem.logrotation.limit?.toLocaleString()}`)
	console.log(`         - Rotation freq.:    ${parseString(config.logging.app.filesystem.logrotation.frequency?.toUpperCase())}`)
	console.log(`         - File ext.:         ${parseString(config.logging.app.filesystem.logrotation.extension)}`)
	console.log(`         - File dateformat:   ${parseString(config.logging.app.filesystem.logrotation.dateFormat)}`)
	console.log(`         - Create symlink:    ${parseBool2Enabled(config.logging.app.filesystem.logrotation.symlink)}`)
	console.log()

	console.log(line)
	console.log(` Server running at http://localhost:${config.server.port}`)
	console.log(line)
	console.log()
}

function parseBool(value: boolean | null | undefined): string {
	return value ? '✅' : '❌'
}

function parseBool2Enabled(value: boolean | null | undefined): string {
	return value ? '✅ enabled' : '❌ disabled'
}

function parseString(value: string | null | undefined): string {
	return value ? value : '<empty>'
}

function parseString2Enabled(value: string | null | undefined): string {
	return value ? `✅ ${value}` : '❌ disabled'
}