/*
 * Imports
 */
import 'dotenv/config'
import * as Server from '@/server'
import { config, checkConfig, logger, welcome } from '@/core'

/*
 * Preflight
 */

// Define global error handling
process.on('unhandledRejection', (error) => {
	logger.fatal({ module: 'main', error })
	process.exit(1)
})
process.on('uncaughtException', (error) => {
	logger.fatal({ module: 'main', error })
	process.exit(1)
})

// Check config
try {
	await checkConfig()
} catch (error: any) {
	if (error instanceof Server.ConfigurationError) {
		logger.error({ module: 'main', error })
		process.exit(1)
	}
}

/*
 * Takeoff
 */

// Start HTTP server
Server.server.listen(config.server.port, () => {
	welcome.print()
	logger.info({ module: 'server' }, `Server started at http://localhost:${config.server.port}`)
	logger.trace({ module: 'server', config }, `Configuration`)
})
