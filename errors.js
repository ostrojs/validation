var Errors = function() {
    this.errors = {};
};

Errors.prototype = {
    constructor: Errors,

    add: function(attribute, message) {
        if (!this.has(attribute)) {
            this.errors[attribute] = [];
        }

        if (this.errors[attribute].indexOf(message) === -1) {
            this.errors[attribute].push(message);
        }
    },

    get: function(attribute) {
        if (this.has(attribute)) {
            return this.errors[attribute];
        }

        return [];
    },

    first: function(attribute) {
        if (this.has(attribute)) {
            return this.errors[attribute][0];
        }

        return false;
    },

    all: function() {
        return this.errors;
    },

    has: function(attribute) {
        if (this.errors.hasOwnProperty(attribute)) {
            return true;
        }

        return false;
    }
};

module.exports = Errors;