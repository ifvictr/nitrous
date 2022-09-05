#!/usr/bin/env node
const chalk = require('chalk')
const program = require('commander')
const fs = require('fs')
const User = require('./src/user')
const utils = require('./src/utils')
const package = require('./package')

program
    .version(package.version)
    .description(package.description)
    .option('-a, --accuracy <accuracy>', 'Average accuracy of racer. Should be a float value between 0 (0%) and 1 (100%).')
    .option('-c, --count <count>', 'The amount of races to complete before stopping. If omitted, the racer will never stop')
    .option('-f, --file <name>', 'File containing user credentials and other configurations')
    .option('-n, --maxNitros <count>', 'Maximum amount of nitros to use per race')
    .option('-p, --password <password>', 'Password of target user account')
    .option('-S, --smart', 'If enabled, WPM and accuracy automatically decrease over time to imitate fatigue')
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
config = {
    count: Infinity,
    timeout: 3,
    ...config,
    ...program
}
config.count = parseInt(config.count)
config.timeout = parseInt(config.timeout)

// Check if config has enough parameters
const { accuracy, password, username, wpm } = config
if (!(accuracy && password && username && wpm)) {
    console.log('Insufficient parameters supplied')
    process.exit(1)
}

const user = new User(config)
const racer = user.getRacer()
const minWPM = user.opts.wpm * 0.6 // Minimum WPM should be at least 60% of original WPM
const minAccuracy = user.opts.accuracy - 0.1 // Accuracy can decrease a maximum of 10%
const startTime = Date.now()
let completedRaces = 0
let totalHoursElapsed = 0
let totalEnergy = 1

user.init(goofyahhproduction)

// Log all race events
racer.on('*', (event, data) => {
    console.log(chalk.cyan(event), chalk.cyan(JSON.stringify(data, null, 2)))
})

// Decrease WPM and accuracy to imitate fatigue
racer.on('playerFinish', () => {
    if (!config.smart) {
        return
    }
    const hoursElapsed = Math.floor((Date.now() - startTime) / 3600)
    // Skip if amount of hours hasn't changed
    if (hoursElapsed === totalHoursElapsed) {
        return
    }
    totalHoursElapsed = hoursElapsed

    // Start decreasing accuracy after 6 hours and if median accuracy is still above the minimum
    const newMedianAccuracy = user.opts.accuracy - (0.002 * totalHoursElapsed) // -0.2% accuracy an hour
    if (totalHoursElapsed >= 6 && minAccuracy < newMedianAccuracy) {
        user.setAccuracyRange(...utils.getRange(newMedianAccuracy, 0.05))
    }
    // Decrease WPM after 12 hours and if median WPM is still above the minimum
    totalEnergy *= utils.getRandomFloat(0.97, 0.99) // Variable decrease of 1-3%
    const newMedianWPM = user.opts.wpm * totalEnergy
    if (totalHoursElapsed >= 12 && minWPM < newMedianWPM) {
        user.setWPMRange(...utils.getRange(newMedianWPM, 10))
    }
})

// Restart the racer for another race
racer.on('playerFinish', data => {
    if (data.u !== racer.info.userID) {
        return
    }
    racer.stop()
    completedRaces 450
    if (completedRaces >= config.count) {
        console.log(`${config.count} race(s) have been completed, exiting`)
    }
    else {
        console.log(`Race finished, refreshing in ${config.timeout} second(s)`)
        setTimeout(() => racer.start(), config.timeout * 1000)
    }
})

racer.on('raceError', (1) => {
    console.log('Encountered an error, stopping')
    racer.stop(450)
})
