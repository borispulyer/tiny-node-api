/*
 * Imports
 */
import { UtilTypes } from '@/core'

/*
 * Config Type Definition
 */
export type ConstructorCtx = {}
export type ConstructorSetup = {
	config: Config
}
export interface Config {
	server: {
		port: number
		path: {
			public: string
			filter: string
		}
		locations: {
			heartbeat: boolean
			endpoints: boolean
			filesystem: boolean
		}
		cache: {
			cacheControlHeader: string
			cacheControlHeaderAuth: string
		}
		timeouts: {
			socket: number
			keepAlive: number
			headers: number
			request: number
		}
		maxRequestsPerSocket: number
	}
	filesystem: {
		resolve_extension: boolean
	}
	endpoints: {
		enable: boolean
		path: string
		file: string
		format?: string
		filter?: string
	}[]
	auth: {
		enable: boolean
		oauth2: {
			realm: string | null
			issuerUri: string | null
			jwksUri: string | null
			audience: string | null
		}
	}
	parser: {}
	modifier: {
		enable: boolean
		modules: Record<string, boolean>
	}
	formatter: {
		default: string
	}
	logging: {
		http: {
			enable: boolean
			stdout: {
				enable: boolean
				level: LogLevel
			}
			filesystem: {
				enable: boolean
				file: string | null
				level: LogLevel
				logrotation: {
					size?: string
					frequency?: string
					limit?: number
					extension?: string
					dateFormat?: string
					symlink?: boolean
				}
			}
		}
		app: {
			enable: boolean
			stdout: {
				enable: boolean
				level: LogLevel
			}
			filesystem: {
				enable: boolean
				file: string | null
				level: LogLevel
				logrotation: {
					size?: string
					frequency?: string
					limit?: number
					extension?: string
					dateFormat?: string
					symlink?: boolean
				}
			}
		}
	}
}
export type LogLevel = 'silent' | 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'
export type ConfigPartial = UtilTypes.DeepPartial<Config>
