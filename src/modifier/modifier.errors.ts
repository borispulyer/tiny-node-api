/**
 * Base error for modifier-related failures.
 */
export class ModifierError extends Error {
	public constructor(message: string) {
		super(message)
		this.name = this.constructor.name
	}
}

/**
 * Thrown when modifier modules are misconfigured, e.g., duplicate selectors.
 */
export class ModifierConfigurationError extends ModifierError {
	public constructor(message: string) {
		super(message)
		this.name = this.constructor.name
	}
}

/**
 * Thrown when a referenced modifier is not available.
 */
export class ModifierMissingError extends ModifierError {
	public constructor(message: string) {
		super(message)
		this.name = this.constructor.name
	}
}

/**
 * Thrown when a modifier cannot read a required file.
 */
export class ModifierFileReadError extends ModifierError {
	public constructor(message: string) {
		super(message)
		this.name = this.constructor.name
	}
}

/**
 * Thrown when a modifier tries to access a file outside the allowed root.
 */
export class ModifierFileAccesError extends ModifierError {
	public constructor(message: string) {
		super(message)
		this.name = this.constructor.name
	}
}

/**
 * Thrown when a modifier encounters invalid syntax in input files.
 */
export class ModifierSyntaxError extends ModifierError {
	public constructor(message: string) {
		super(message)
		this.name = this.constructor.name
	}
}
