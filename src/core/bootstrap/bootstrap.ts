/*
 * Imports
 */
import { Config, Logger } from '@/core'
import { Parser } from '@/parser'
import { Modifier } from '@/modifier'
import { Formatter } from '@/formatter'
import { Auth } from '@/auth'
import { Server } from '@/server'
import type * as Types from './bootstrap.types'

/**
 * Create and initialize the full application context with all services.
 * Loads configuration, initializes loggers, registers parsers/formatters/modifiers,
 * optionally sets up authentication, creates the HTTP server, and validates config.
 * @returns Fully initialized application context.
 */
export async function createAppContext(): Promise<Types.AppContext> {
	try {
		const config = await Config.init()
		const logger = await Logger.init({ config })
		const parser = await Parser.init({ logger })
		const modifier = await Modifier.init({ config, logger, parser })
		const formatter = await Formatter.init({ logger })
		const auth = config.auth.enable ? await Auth.init({ config, logger }) : undefined
		const server = await Server.init({ config, logger, parser, modifier, formatter, auth })

		await Config.validateConfig(config, {
			config,
			logger,
			parser,
			modifier,
			formatter,
			auth,
			server,
		})

		return {
			config,
			logger,
			parser,
			modifier,
			formatter,
			auth,
			server,
		}
	} catch (error: any) {
		throw error
	}
}
