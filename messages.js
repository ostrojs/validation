var Attributes = require('./attributes');

var Messages = function(lang, messages) {
    this.lang = lang;
    this.messages = messages;
    this.customMessages = {};
    this.attributeNames = {};
};

Messages.prototype = {
    constructor: Messages,

    _setCustom: function(customMessages) {
        this.customMessages = customMessages || {};
    },

    _setAttributeNames: function(attributes) {
        this.attributeNames = attributes;
    },

    _setAttributeFormatter: function(func) {
        this.attributeFormatter = func;
    },

    _getAttributeName: function(attribute) {
        var name = attribute;
        if (this.attributeNames.hasOwnProperty(attribute)) {
            return this.attributeNames[attribute];
        } else if (this.messages.attributes.hasOwnProperty(attribute)) {
            name = this.messages.attributes[attribute];
        }

        if (this.attributeFormatter) {
            name = this.attributeFormatter(name);
        }

        return name;
    },

    all: function() {
        return this.messages;
    },

    render: function(rule) {
        if (rule.customMessage) {
            return rule.customMessage;
        }
        var template = this._getTemplate(rule);
        if (Attributes.replacements[rule.name]) {
            return Attributes.replacements[rule.name].apply(this, [template, rule]);
        } else {
            return this._replacePlaceholders(rule, template, {});
        }
    },

    _getTemplate: function(rule) {

        var messages = this.messages;
        var template = messages.def;
        var customMessages = this.customMessages;
        var formats = [rule.name + '.' + rule.attribute, rule.name];
        for (var i = 0, format; i < formats.length; i++) {
            format = formats[i];
            if (customMessages.hasOwnProperty(format)) {
                template = customMessages[format];
                break;
            } else if (messages.hasOwnProperty(format)) {
                template = messages[format];
                break;
            }
        }

        if (typeof template === 'object') {
            template = template[rule._getValueType()];
        }

        return template;
    },

    _replacePlaceholders: function(rule, template, data) {

        data.attribute = this._getAttributeName(rule.attribute);
        data[rule.name] = data[rule.name] || rule.getParameters().join(',');

        if (typeof template === 'string' && typeof data === 'object') {
            for (attribute in data) {
                template = template.replace(new RegExp(':' + attribute, 'g'), data[attribute]);
            }
        }

        return template;
    }

};

module.exports = Messages;