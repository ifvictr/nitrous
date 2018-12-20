const mitt = require('mitt')
const qs = require('qs')
const weighted = require('weighted')
const WebSocket = require('ws')
const { DEFAULT_USER_AGENT, SITE_URL, SOCKET_URL } = require('./constants')
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

        // Per-race data
        this.info = {}
        this.racers = []
        this.lessonLength = 0
        this.maxErrors = 0
        this.currentPlace = 0
        this.totalTyped = 0
        this.totalErrors = 0
        this.nitrosUsed = 0

        this.user = user
        this.emitter = mitt()
        this.ws = null

        this.onOpen = this.onOpen.bind(this)
        this.onMessage = this.onMessage.bind(this)

        // Save racer info on join
        this.on('playerJoin', data => {
            if (data.profile.username.toLowerCase() === this.user.opts.username) {
                this.info = { ...data.profile }
            }
        })
        // Keep track of opponent racers and update racer place as race progresses
        this.on('raceUpdate', data => {
            this.racers = data.racers.sort((a, b) => b.t - a.t)
            const index = this.racers.findIndex(racer => racer.u === this.info.userID)
            this.currentPlace = index + 1 // Offset zero-based numbering
        })
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
                    'User-Agent': this.user.opts.userAgent || DEFAULT_USER_AGENT
                },
                origin: SITE_URL
            }
        )
        this.ws.on('open', this.onOpen)
        this.ws.on('message', this.onMessage)

        // Prepare random stats for upcoming race
        const { wpm, accuracy, targetPlace, nitrosToUse } = Racer.getRandomStats(this.user)
        this.setWPM(wpm)
        this.setAccuracy(accuracy)
        this.setTargetPlace(this.user.opts.targetPlace || targetPlace)
        this.setNitrosToUse(nitrosToUse)

        // Reset per-race data
        this.info = {}
        this.racers = []
        this.lessonLength = 0
        this.maxErrors = 0
        this.currentPlace = 0
        this.totalTyped = 0
        this.totalErrors = 0
        this.nitrosUsed = 0
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
                this.maxErrors = Math.round(this.lessonLength * (1 - this.accuracy))
                break
            case 'racing':
                this.intervalId = setInterval(() => {
                    const isIncorrect = Math.random() > this.accuracy && this.totalErrors < this.maxErrors
                    const useNitro = Math.random() > 0.9 && this.nitrosUsed < this.nitrosToUse
                    const charsFromNitro = useNitro ? utils.getRandomInt(5, 12) : 0
                    // Calculate the amount of characters to move forward
                    if (!isIncorrect) {
                        this.totalTyped += charsFromNitro + 1
                        // Player isn't in target place and there are opponents to beat
                        if (this.racers.length > 1 && this.currentPlace > this.targetPlace) {
                            const targetRacer = this.racers[this.targetPlace - 1]
                            const racer = this.racers[this.currentPlace - 1]
                            const distance = targetRacer.t - racer.t
                            this.totalTyped += Math.min(Math.round(distance / 4), 3) // Gradually catch up to target
                        }
                    }

                    this.send({
                        stream: 'race',
                        msg: 'update',
                        payload: {
                            t: Math.min(this.totalTyped, this.lessonLength),
                            e: isIncorrect ? ++this.totalErrors : undefined,
                            n: useNitro ? ++this.nitrosUsed : undefined,
                            s: useNitro ? charsFromNitro : undefined
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

    getWPM() {
        return this.wpm
    }

    setWPM(wpm) {
        this.wpm = wpm
    }

    getAccuracy() {
        return this.accuracy
    }

    setAccuracy(accuracy) {
        this.accuracy = Math.min(Math.max(accuracy, 0), 1) // Require accuracy to be between 0 and 1
    }

    getTargetPlace() {
        return this.targetPlace
    }

    setTargetPlace(place) {
        this.targetPlace = place
    }

    getNitrosToUse() {
        return this.nitrosToUse
    }

    setNitrosToUse(count) {
        this.nitrosToUse = count
    }

    static getRandomStats(user) {
        const place = weighted.select({
            1: 0.4,
            2: 0.3,
            3: 0.15,
            4: 0.1,
            5: 0.05
        })
        return {
            wpm: utils.getRandomInt(...user.getWPMRange()),
            accuracy: utils.getRandomFloat(...user.getAccuracyRange(), 4),
            targetPlace: parseInt(place),
            nitrosToUse: utils.getRandomInt(0, user.opts.maxNitros)
        }
    }
}

module.exports = Racer