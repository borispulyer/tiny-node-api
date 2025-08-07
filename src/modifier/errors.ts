/*
 * Error Definitions
 */
export class ModifierError extends Error {
	public constructor(message: string) {
		super(message)
		this.name = this.constructor.name
	}
}
export class ModifierMissingError extends ModifierError {
	public constructor(message: string) {
		super(message)
		this.name = this.constructor.name
	}
}
export class ModifierFilereadError extends ModifierError {
	public constructor(message: string) {
		super(message)
		this.name = this.constructor.name
	}
}
export class ModifierSyntaxError extends ModifierError {
	public constructor(message: string) {
		super(message)
		this.name = this.constructor.name
	}
}
