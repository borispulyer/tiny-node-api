import type { Config, Logger } from '@/core'
import type { Parser } from '@/parser'
import { Modifier } from '@/modifier'
import { Formatter } from '@/formatter'
import { Auth } from '@/auth'
import { Server } from '@/server'

export interface AppContext {
	config: Config
	logger: Logger
	parser: Parser
	modifier: Modifier
	formatter: Formatter
	auth: Auth | undefined
	server: Server
}
