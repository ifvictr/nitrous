const nitrotype = require('nitrotype')
const Racer = require('./racer')
const utils = require('./utils')

class User {
    constructor(opts) {
        // Default config
        this.opts = {
            accuracy: 0.93,
            maxNitros: 0,
            password: null,
            targetPlace: 0,
            username: '',
            wpm: 45,
            ...opts
        }
        this.opts.accuracy = parseFloat(this.opts.accuracy)
        this.opts.maxNitros = parseInt(this.opts.maxNitros)
        this.opts.targetPlace = parseInt(this.opts.targetPlace)
        this.opts.username = this.opts.username.toLowerCase()
        this.opts.wpm = parseInt(this.opts.wpm)

        this.wpmRange = utils.isRange(this.opts.wpm)
            ? this.opts.wpm
            : utils.getRange(this.opts.wpm, 10)
        this.accuracyRange = utils.isRange(this.opts.accuracy)
            ? this.opts.accuracy
            : utils.getRange(this.opts.accuracy, 0.05)

        this.client = nitrotype(this.opts)
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