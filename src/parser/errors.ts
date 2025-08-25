/*
 * Error Definitions
 */
export class ParserError extends Error {
	public constructor(message: string) {
		super(message)
		this.name = this.constructor.name
	}
}

export class ParserMissingError extends ParserError {
	public constructor(message: string) {
		super(message)
		this.name = this.constructor.name
	}
}

export class ParserFilereadError extends ParserError {
	public constructor(message: string) {
		super(message)
		this.name = this.constructor.name
	}
}

export class ParserSyntaxError extends ParserError {
	public constructor(message: string) {
		super(message)
		this.name = this.constructor.name
	}
}
