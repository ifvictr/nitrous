const cookie = require('cookie')

exports.getRange = (num, padding) => [num - padding, num + padding]

exports.getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

exports.serializeCookies = obj => Object.entries(obj)
    .reduce((str, [key, value]) => `${str} ${cookie.serialize(key, value)};`, '')