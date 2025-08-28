/*
 * Imports
 */
import { createAppContext, printWelcome } from '@/core'

/*
 * Preflight
 */

// Create app context
const ctx = await createAppContext()

// Define global error handling
process.on('unhandledRejection', (error) => {
	ctx.logger.fatal({ module: 'main', error })
	process.exit(1)
})
process.on('uncaughtException', (error) => {
	ctx.logger.fatal({ module: 'main', error })
	process.exit(1)
})

/*
 * Takeoff
 */

// Start HTTP server
ctx.server.start()

// Print welcome Screen
printWelcome(ctx)
