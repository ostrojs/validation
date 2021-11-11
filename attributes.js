var replacements = {

    between: function(template, rule) {
        var parameters = rule.getParameters();
        return this._replacePlaceholders(rule, template, {
            min: parameters[0],
            max: parameters[1]
        });
    },

    required_if: function(template, rule) {
        var parameters = rule.getParameters();
        return this._replacePlaceholders(rule, template, {
            other: this._getAttributeName(parameters[0]),
            value: parameters[1]
        });
    },

    required_unless: function(template, rule) {
        var parameters = rule.getParameters();
        return this._replacePlaceholders(rule, template, {
            other: this._getAttributeName(parameters[0]),
            value: parameters[1]
        });
    },

    required_with: function(template, rule) {
        var parameters = rule.getParameters();
        return this._replacePlaceholders(rule, template, {
            field: this._getAttributeName(parameters[0])
        });
    },

    required_with_all: function(template, rule) {
        var parameters = rule.getParameters();
        var getAttributeName = this._getAttributeName.bind(this);
        return this._replacePlaceholders(rule, template, {
            fields: parameters.map(getAttributeName).join(', ')
        });
    },

    required_without: function(template, rule) {
        var parameters = rule.getParameters();
        return this._replacePlaceholders(rule, template, {
            field: this._getAttributeName(parameters[0])
        });
    },

    required_without_all: function(template, rule) {
        var parameters = rule.getParameters();
        var getAttributeName = this._getAttributeName.bind(this);
        return this._replacePlaceholders(rule, template, {
            fields: parameters.map(getAttributeName).join(', ')
        });
    },

    after: function(template, rule) {
        var parameters = rule.getParameters();
        return this._replacePlaceholders(rule, template, {
            after: this._getAttributeName(parameters[0])
        });
    },

    before: function(template, rule) {
        var parameters = rule.getParameters();
        return this._replacePlaceholders(rule, template, {
            before: this._getAttributeName(parameters[0])
        });
    },

    after_or_equal: function(template, rule) {
        var parameters = rule.getParameters();
        return this._replacePlaceholders(rule, template, {
            after_or_equal: this._getAttributeName(parameters[0])
        });
    },

    before_or_equal: function(template, rule) {
        var parameters = rule.getParameters();
        return this._replacePlaceholders(rule, template, {
            before_or_equal: this._getAttributeName(parameters[0])
        });
    },

    same: function(template, rule) {
        var parameters = rule.getParameters();
        return this._replacePlaceholders(rule, template, {
            same: this._getAttributeName(parameters[0])
        });
    },

    mimes: function(template, rule) {
        var parameters = rule.getParameters();
        return this._replacePlaceholders(rule, template, {
            value: parameters
        });
    },
    mimetypes: function(template, rule) {
        var parameters = rule.getParameters();
        return this._replacePlaceholders(rule, template, {
            value: parameters
        });
    },
};

function formatter(attribute) {
    return attribute.replace(/[_\[]/g, ' ').replace(/]/g, '');
}

module.exports = {
    replacements: replacements,
    formatter: formatter
};