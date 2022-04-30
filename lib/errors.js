'use strict'

const createError = require('@fastify/error')

const FST_RST_UNKNOWN_PROTOCOL = createError('FST_RST_UNKNOWN_PROTOCOL', 'Unknown Protocol %s')

module.exports = {
  FST_RST_UNKNOWN_PROTOCOL
}
