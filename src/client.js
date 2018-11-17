const nitrotype = require('nitrotype')
const Racer = require('./racer')

class Client {
    constructor(opts) {
        this.opts = opts
        this.ntClient = nitrotype(opts)
        this.racer = new Racer(this)
    }

    async init() {
        try {
            await this.ntClient.login()
            this.racer.start()
        }
        catch (e) {
            console.log(e)
        }
    }
}

module.exports = Client