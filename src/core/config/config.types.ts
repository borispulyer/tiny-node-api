/**
 * Config Type Definition
 */
export interface Config {
	server: {
		port: number
		root: string
		locations: {
			heartbeat: boolean
			endpoints: boolean
			filesystem: boolean
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
		filter?: (data: any, params?: Record<string, string>) => any
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
			level: LogLevel
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
			level: LogLevel
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

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'
