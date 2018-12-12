const mitt = require('mitt')
const qs = require('qs')
const weighted = require('weighted')
const WebSocket = require('ws')
const { SITE_URL, SOCKET_URL } = require('./constants')
const utils = require('./utils')

const eventNames = {
    // Race
    countdown: 'raceCountdown',
    error: 'raceError',
    racing: 'raceStart',
    setup: 'raceSetup',
    status: 'raceStatus',
    update: 'raceUpdate',
    // Player
    joined: 'playerJoin',
    left: 'playerLeave'
}
const eventKeys = Object.keys(eventNames)

class Racer {
    constructor(user) {
        this.wpm = 0
        this.accuracy = 0
        this.targetPlace = 0
        this.nitrosToUse = 0

        this.user = user
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
                    Cookie: utils.serializeCookies(this.user.getClient()._cookies),
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36'
                },
                origin: SITE_URL
            }
        )
        this.ws.on('open', this.onOpen)
        this.ws.on('message', this.onMessage)

        // Prepare random stats for upcoming race
        const { wpm, accuracy, targetPlace, nitrosToUse } = this.getRandomStats()
        this.setWPM(wpm)
        this.setAccuracy(accuracy)
        this.setTargetPlace(targetPlace)
        this.setNitrosToUse(nitrosToUse)
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

        const event = parsed.payload.status || parsed.msg
        if (eventKeys.includes(event)) {
            this.emitter.emit(eventNames[event], parsed.payload)
        }

        switch (event) {
            case 'countdown':
                this.lessonLength = parsed.payload.l.length
                break
            case 'racing':
                let typed = 0
                let errors = 0
                let nitrosUsed = 0
                const maxErrors = this.lessonLength * (1 - this.accuracy)
                this.intervalId = setInterval(() => {
                    const isIncorrect = Math.random() > this.accuracy && errors < maxErrors
                    const useNitro = Math.random() > 0.9 && nitrosUsed < this.nitrosToUse
                    const fromNitro = useNitro ? utils.getRandomInt(5, 12) : 0
                    this.send({
                        stream: 'race',
                        msg: 'update',
                        payload: {
                            t: !isIncorrect ? ++typed + fromNitro : typed,
                            e: isIncorrect ? ++errors : undefined,
                            n: useNitro ? ++nitrosUsed : undefined,
                            s: useNitro ? fromNitro : undefined
                        }
                    })
                }, (12000 / this.wpm))
                break
            case 'update':
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
                break
        }
    }

    setWPM(wpm) {
        this.wpm = wpm
    }

    setAccuracy(accuracy) {
        this.accuracy = Math.min(Math.max(accuracy, 0), 1) // Require accuracy to be between 0 and 1
    }

    setTargetPlace(place) {
        this.targetPlace = place
    }

    setNitrosToUse(count) {
        this.nitrosToUse = count
    }

    getRandomStats() {
        const place = weighted.select({
            1: 0.4,
            2: 0.3,
            3: 0.15,
            4: 0.1,
            5: 0.05
        })
        return {
            wpm: utils.getRandomInt(...this.user.wpmRange),
            accuracy: utils.getRandomFloat(...this.user.accuracyRange, 4),
            targetPlace: parseInt(place),
            nitrosToUse: utils.getRandomInt(0, this.user.opts.maxNitros)
        }
    }
}

module.exports = Racer