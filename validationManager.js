const validation = require('./validation')
const {
    Macroable
} = require('@ostro/support/macro')
const kApp = Symbol('app')
class ValidationManager extends Macroable {
    constructor(app) {
        super()
        Object.defineProperty(this, kApp, {
            value: app,
        })

    }
    make(inputs, schema, messages = {}) {
        return Promise.resolve(new validation(inputs, schema, messages))
    }
    validate(inputs, schema, messages = {}) {
        return this.make(inputs, schema, messages).then(validation => {
            if (validation.fails()) {
                return Promise.reject(validation.errors())
            } else {
                return Promise.resolve(true)
            }
        })
    }
    static extend(name, cb, message) {
        validation.register(name, cb, message)
    }
    static extendAsync(name, cb, message) {
        validation.registerAsync(name, cb, message)
    }
    extend(name, cb, message) {
        validation.register(name, cb, message)
    }
    extendAsync(name, cb, message) {
        validation.registerAsync(name, cb, message)
    }

    static __call(target, method, args) {
        return validation[method](...args);
    }
    __call(target, method, args) {
        return validation[method](...args);
    }
}

module.exports = ValidationManager