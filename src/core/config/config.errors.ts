/*
 * Error Definitions
 */
export class ConfigError extends Error {
	public config: any

	public constructor(message?: string, config?: any) {
		super(message)
		this.name = this.constructor.name
		this.config = config
	}
}

export class ConfigValidationError extends ConfigError {
	public constructor(message?: string, config?: any) {
		super(message, config)
		this.name = this.constructor.name
	}
}
