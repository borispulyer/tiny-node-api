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
			files: boolean
		}
	}
	files: {
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
			realm: string | undefined
			issuer_uri: string | undefined
			jwks_uri: string | undefined
			audience: string | undefined
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
}
