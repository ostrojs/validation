var Messages = require('./messages');

require('./lang/en');

var require_method = require;

var container = {

    messages: {},

    _set: function(lang, rawMessages) {
        this.messages[lang] = rawMessages;
    },

    _setRuleMessage: function(lang, attribute, message) {
        this._load(lang);
        if (message === undefined) {
            message = this.messages[lang].def;
        }

        this.messages[lang][attribute] = message;
    },

    _load: function(lang) {
        if (!this.messages[lang]) {
            try {
                var rawMessages = require_method('./lang/' + lang);
                this._set(lang, rawMessages);
            } catch (e) {}
        }
    },

    _get: function(lang) {
        this._load(lang);
        return this.messages[lang];
    },

    _make: function(lang) {
        this._load(lang);
        return new Messages(lang, this.messages[lang]);
    }

};

module.exports = container;