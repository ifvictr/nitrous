const mitt = require('mitt')
const qs = require('qs')
const WebSocket = require('ws')
const { SITE_URL, SOCKET_URL } = require('./constants')
const utils = require('./utils')

class Racer {
    constructor(client) {
        this.wpm = client.opts.wpm
        this.accuracy = client.opts.accuracy
        this.useNitros = client.opts.useNitros
        this.targetPosition = client.opts.targetPosition

        this.client = client
        this.emitter = mitt()
        this.ws = null

        this.onOpen = this.onOpen.bind(this)
        this.onMessage = this.onMessage.bind(this)
    }

    start() {
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
                    Cookie: utils.serializeCookies(this.client.ntClient._cookies),
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36'
                },
                origin: SITE_URL
            }
        )
        this.ws.on('open', this.onOpen)
        this.ws.on('message', this.onMessage)
    }

    stop() {
        clearInterval(this.intervalId)
        this.ws.close()
    }

    send(data) {
        if (!this.ws) {
            return
        }
        this.ws.send('4' + JSON.stringify(data))
    }

    on(...args) {
        return this.emitter.on(...args)
    }

    onOpen() {
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
                track: 'grass',
                music: 'standard',
                update: 3417,
            }
        })
    }

    onMessage(data) {
        const parsed = JSON.parse(data.substring(1))
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
                break
        }
        if (parsed.msg === 'update') {
            parsed.payload.racers.map(racer => {
                if (racer.c) {
                    this.emitter.emit('playerFinish', racer)
                }
                if (racer.d) {
                    this.emitter.emit('playerDisqualify', racer)
                }
                if (racer.e) {
                    this.emitter.emit('playerError', racer)
                }
                if (racer.n) {
                    this.emitter.emit('playerNitro', racer)
                }
            })
        }
        const statusMap = {
            countdown: 'countdownStart',
            racing: 'raceStart'
        }
        switch (parsed.payload.status) {
            case 'countdown':
                this.emitter.emit('countdownStart', parsed.payload)
                this.lessonLength = parsed.payload.l.length
                break
            case 'racing':
                this.emitter.emit('raceStart', parsed.payload)
                let errors = 0
                let typed = 0
                let maxErrors = this.lessonLength * (1 - this.accuracy)
                this.intervalId = setInterval(() => {
                    const isIncorrect = Math.random() > this.accuracy
                    this.send({
                        stream: 'race',
                        msg: 'update',
                        payload: (isIncorrect && errors < maxErrors) ? { e: ++errors } : { t: ++typed }
                    })
                }, (12000 / this.wpm))
                // Sent every 500ms
                // TODO: Target a random position (e.g. first 35%, second 25%, third 15%, fourth 15%, fifth 10%)
                break
        }
    }

    setWPM(wpm) {
        this.wpm = wpm
    }

    setAccuracy(accuracy) {
        this.accuracy = accuracy
    }
}

module.exports = Racer