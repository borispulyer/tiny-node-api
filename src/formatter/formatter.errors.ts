/**
 * Base error for formatter-related failures.
 */
export class FormatterError extends Error {
	public constructor(message?: string) {
		super(message)
		this.name = this.constructor.name
	}
}

/**
 * Thrown when formatter modules are misconfigured, e.g., duplicate selectors.
 */
export class FormatterConfigurationError extends FormatterError {
	public constructor(message?: string) {
		super(message)
		this.name = this.constructor.name
	}
}

/**
 * Thrown when no formatter is available for a required selector.
 */
export class FormatterMissingError extends FormatterError {
	public constructor(message?: string) {
		super(message)
		this.name = this.constructor.name
	}
}
