const ValidationExceptionContract = require('@ostro/contracts/validation/validationException')
class ValidationException extends ValidationExceptionContract {
    constructor() {
        super()
        this.name = this.constructor.name;
        this.message = 'Given data was invalid';
        this.errors = {};
        this.status = 422;
        Error.captureStackTrace(this, this.constructor);
    }
    add(attribute, message) {
        if (!this.has(attribute)) {
            this.errors[attribute] = [];
        }

        if (this.errors[attribute].indexOf(message) === -1) {
            this.errors[attribute].push(message);
        }
    }

    getMessage() {
        return this.message
    }

    get(attribute) {
        if (this.has(attribute)) {
            return this.errors[attribute];
        }

        return [];
    }

    getErrors() {
        return this.errors
    }
    first(attribute) {
        if (this.has(attribute)) {
            return this.errors[attribute][0];
        }

        return false;
    }

    all() {
        return this.errors;
    }

    has(attribute) {
        if (this.errors.hasOwnProperty(attribute)) {
            return true;
        }

        return false;
    }
}
module.exports = ValidationException