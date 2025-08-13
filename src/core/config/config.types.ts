/**
 * Config Type Definition
 */
export interface Config {
	server: {
		port: number
		root: string
	}
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
