/*
 * Error Definitions
 */
export class FormatterError extends Error {
	public constructor(message?: string) {
		super(message)
		this.name = this.constructor.name
	}
}

export class FormatterConfigurationError extends FormatterError {
	public constructor(message?: string) {
		super(message)
		this.name = this.constructor.name
	}
}

export class FormatterMissingError extends FormatterError {
	public constructor(message?: string) {
		super(message)
		this.name = this.constructor.name
	}
}
