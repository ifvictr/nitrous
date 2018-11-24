#!/usr/bin/env node
const chalk = require('chalk')
const program = require('commander')
const fs = require('fs')
const User = require('./src/user')
const package = require('./package')

program
    .version(package.version)
    .description(package.description)
    .option('-a, --accuracy <accuracy>', 'Average accuracy of racer. Should be a float value between 0 (0%) and 1 (100%).')
    .option('-c, --count <count>', 'The amount of races to complete before stopping. If omitted, the racer will never stop')
    .option('-f, --file <name>', 'File containing user credentials')
    .option('-n, --maxNitros <count>', 'Maximum amount of nitros to use per race')
    .option('-p, --password <password>', 'Password of target user account')
    .option('-s, --targetPlace <place>', 'Target place (i.e. first place) of the racer (cannot be guaranteed)')
    .option('-t, --timeout <seconds>', 'Time to wait before starting the next race')
    .option('-u, --username <username>', 'Username (not display name) of target user account')
    .option('-w, --wpm <wpm>', 'Average WPM of racer')
    .parse(process.argv)

// Attempt to start with config from file
const { file } = program
let config = {}
if (file) {
    if (fs.existsSync(file)) {
        config = JSON.parse(fs.readFileSync(file))
    }
    else {
        console.log('Supplied config file was not found')
        process.exit(1)
    }
}
// Let command arguments override values in file
config = { ...config, ...program }
config.accuracy = config.accuracy ? parseFloat(config.accuracy) : 0.93
config.count = config.count ? parseInt(config.count) : Infinity
config.timeout = config.timeout ? parseInt(config.timeout) : 3
config.username = config.username.toLowerCase()
config.wpm = config.wpm ? parseInt(config.wpm) : 40

// Check if config has enough parameters
const { accuracy, password, username, wpm } = config
if (!(accuracy && password && username && wpm)) {
    console.log('Insufficient parameters supplied')
    process.exit(1)
}

const user = new User(config)
const racer = user.getRacer()
let info = {}
let completedRaces = 0

user.init()
racer.on('*', (event, data) => {
    console.log(chalk.cyan.bold(event), chalk.cyan(JSON.stringify(data, null, 2)))
})
racer.on('playerJoin', data => {
    if (data.profile.username.toLowerCase() === config.username) {
        info = { ...data.profile }
    }
})
racer.on('playerFinish', data => {
    if (data.u !== info.userID) {
        return
    }
    racer.stop()
    completedRaces++
    if (completedRaces >= config.count) {
        console.log(`${config.count} race(s) have been completed, exiting`)
    }
    else {
        console.log(`Race finished, refreshing in ${config.timeout} second(s)`)
        setTimeout(() => racer.start(), config.timeout * 1000)
    }
})
racer.on('raceError', () => {
    console.log('Encountered an error, stopping')
    racer.stop()
})