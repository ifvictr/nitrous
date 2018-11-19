const nitrotype = require('nitrotype')
const Racer = require('./racer')
const utils = require('./utils')

class User {
    constructor(opts) {
        this.wpmRange = utils.isRange(opts.wpm)
            ? opts.wpm
            : utils.getRange(opts.wpm, 10)
        this.accuracyRange = utils.isRange(opts.accuracy)
            ? opts.accuracy
            : utils.getRange(opts.accuracy, 0.05)
        this.maxNitros = opts.maxNitros || 0

        this.client = nitrotype(opts)
        this.racer = new Racer(this)
    }

    async init() {
        try {
            await this.client.login()
            this.racer.start()
        }
        catch (e) {
            console.log(e)
        }
    }

    getClient() {
        return this.client
    }

    getRacer() {
        return this.racer
    }
}

module.exports = User