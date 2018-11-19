const User = require('./user')

class Manager {
    constructor(users = []) {
        this.users = new Map()

        // When only one player object is provided
        if (!Array.isArray(users)) {
            users = [users]
        }
        users.map(opts => this.addUser(opts))
    }

    getUser(username) {
        return this.users.get(username)
    }

    addUser(opts) {
        const user = new User(opts)
        this.users.set(opts.username, user)
    }

    removeUser(username) {
        return this.users.delete(username)
    }

    getUsers() {
        return this.users
    }
}

module.exports = Manager