const chalk = require('chalk')
const mitt = require('mitt')
const nitrotype = require('nitrotype')
const rot47 = require('rot47')
const qs = require('qs')
const WebSocket = require('ws')
const utils = require('./utils')

const SITE_URL = 'https://www.nitrotype.com'
const SOCKET_URL = 'wss://realtime1.nitrotype.com/realtime'

class Player {
    constructor(opts) {
        this.wpm = utils.getRandomInt(...utils.getRange(opts.wpm, 10))
        this.accuracy = utils.getRandomInt(...utils.getRange(opts.accuracy * 100)) / 100
        this.emitter = mitt()
        this.client = nitrotype(opts)
        this.ws = null
        // Testing
        this.emitter.on('*', (event, payload) => console.log(chalk.cyan(event), chalk.cyan(JSON.stringify(payload, null, 2))))
    }

    async init() {
        await this.client.login()
        this.ws = new WebSocket(
            `${SOCKET_URL}?` + qs.stringify({
                _primuscb: `${Date.now()}-0`,
                EIO: 3,
                transport: 'websocket',
                t: Date.now(),
                b64: 1
            }),
            {
                headers: {
                    Cookie: utils.serializeCookies(this.client._cookies),
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36'
                },
                origin: SITE_URL
            } 
        )
        this.ws.on('open', () => {
            this.send({
                stream: 'checkin',
                path: '/race',
                extra: {}
            })
            this.send({
                stream: 'race',
                msg: 'join',
                payload: {
                    debugging: false,
                    avgSpeed: this.wpm,
                    track: 'arctic',
                    music: 'standard',
                    update: 3417,
                }
            })
        })
        this.ws.on('close', (...args) => {
            console.log(...args)
        })
        this.ws.on('error', (...args) => {
            console.log(...args)
        })
        this.ws.on('message', data => {
            // console.log(data)
            const parsed = JSON.parse(data.substring(1))
            // Streams: checkin, race, chat, notifications
            if (!parsed.hasOwnProperty('payload')) {
                return
            }
            const msgPairs = {
                joined: 'playerJoin',
                left: 'playerLeave',
                setup: 'raceSetup',
                update: 'raceUpdate'
            }
            switch (parsed.msg) {
                case 'joined':
                case 'left':
                case 'setup':
                case 'update':
                    this.emitter.emit(msgPairs[parsed.msg], parsed.payload)
                    // TODO: Emit race finish, DQs, player leave, nitro used, error, chat
                    break
            }
            const statusMap = {
                countdown: 'countdownStart',
                racing: 'raceStart'
            }
            switch (parsed.payload.status) {
                case 'countdown':
                    this.emitter.emit('countdownStart', parsed.payload)
                    // Unnecessary for functionality
                    console.log('lesson: ', rot47(parsed.payload.l).split('').reverse().join(''))
                    console.log('length of lesson: ', parsed.payload.l.length)
                    break
                case 'racing':
                    this.emitter.emit('raceStart', parsed.payload)
                    let errors = 0
                    let typed = 0
                    // TODO: Send update only once a second and increment index by random number obtained from WPM and accuracy
                    setInterval(() => {
                        const isIncorrect = Math.random() > this.accuracy
                        this.send({
                            stream: 'race',
                            msg: 'update',
                            payload: isIncorrect ? { e: ++errors } : { t: ++typed }
                        })
                    }, (12000 / this.wpm))
                    // TODO: Auto-refresh when race is finished
                    // TODO: Refine typing algorithm to be more realistic and have more drastic changes
                    // TODO: Target a random position (e.g. first 35%, second 25%, third 15%, fourth 15%, fifth 10%)
                    break
            }
        })
    }

    send(data) {
        if (!this.ws) {
            return
        }
        this.ws.send('4' + JSON.stringify(data))
    }
}

module.exports = Player
