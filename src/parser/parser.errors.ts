/**
 * Base error for parser-related failures.
 */
export class ParserError extends Error {
	public constructor(message: string) {
		super(message)
		this.name = this.constructor.name
	}
}

/**
 * Thrown when parser modules are misconfigured, e.g., duplicate extensions.
 */
export class ParserConfigurationError extends ParserError {
	public constructor(message: string) {
		super(message)
		this.name = this.constructor.name
	}
}

/**
 * Thrown when no parser is available for a required file extension.
 */
export class ParserMissingError extends ParserError {
	public constructor(message: string) {
		super(message)
		this.name = this.constructor.name
	}
}

/**
 * Thrown when a file cannot be read from the filesystem.
 */
export class ParserFilereadError extends ParserError {
	public constructor(message: string) {
		super(message)
		this.name = this.constructor.name
	}
}

/**
 * Thrown when parsing fails due to invalid syntax.
 */
export class ParserSyntaxError extends ParserError {
	public constructor(message: string) {
		super(message)
		this.name = this.constructor.name
	}
}
