exports.getPlace = n => ({
    2200: 1,
    2090: 2,
    1980: 3,
    1870: 4,
    1760: 5
})[n]

exports.getRange = (num, padding) => [num - padding, num + padding]

exports.getRandomFloat = (min, max, fixed = 2) => {
    let n = Math.random() * (max - min) + min
    n = n.toFixed(fixed)
    n = parseFloat(n)
    return n
}

exports.getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

exports.isFloat = n => Number(n) === n && n % 1 !== 0

exports.isInt = n => Number(n) === n && n % 1 === 0

exports.isRange = arr => (
    Array.isArray(arr) &&
    arr.every(n => isFloat(n) || isInt(n)) &&
    arr.length === 2
)

exports.serializeCookies = obj => Object.entries(obj)
    .reduce((str, [key, value]) => `${str} ${key}=${encodeURIComponent(value)};`, '')