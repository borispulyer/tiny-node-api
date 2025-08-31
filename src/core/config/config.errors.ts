/**
 * Base error for configuration-related issues.
 */
export class ConfigError extends Error {
	public config: any

	public constructor(message?: string, config?: any) {
		super(message)
		this.name = this.constructor.name
		this.config = config
	}
}

/**
 * Thrown when configuration validation fails.
 */
export class ConfigValidationError extends ConfigError {
	public constructor(message?: string, config?: any) {
		super(message, config)
		this.name = this.constructor.name
	}
}
