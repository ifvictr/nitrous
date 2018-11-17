const nitrotype = require('nitrotype')
const Racer = require('./racer')

class User {
    constructor(opts) {
        this.opts = opts

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