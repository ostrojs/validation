require('@ostro/support/helpers')
var Rules = require('./rules');
var Lang = require('./lang');
var Attributes = require('./attributes');
var AsyncResolvers = require('./async');
var validationException = require('./validationException');
var Validator = function (input, rules, customMessages) {
    var lang = Validator.getDefaultLang();
    this.input = input || {};

    this.messages = Lang._make(lang);
    this.messages._setCustom(customMessages);
    this.setAttributeFormatter(Validator.prototype.attributeFormatter);

    this.errorBag = new validationException();
    this.errorCount = 0;

    this.hasAsync = false;
    this.rules = this._parseRules(rules);
};

Validator.prototype = {

    constructor: Validator,

    lang: 'en',

    numericRules: ['integer', 'numeric'],

    attributeFormatter: Attributes.formatter,

    errors: function () {
        return this.errorBag
    },
    check: async function () {
        var self = this;

        for (var attribute in this.rules) {
            var attributeRules = this.rules[attribute];
            var inputValue = this._objectPath(this.input, attribute);

            if (this._hasRule(attribute, ['sometimes']) && !this._suppliedWithData(attribute)) {
                continue;
            }

            for (var i = 0, len = attributeRules.length, rule, ruleOptions, rulePassed; i < len; i++) {
                ruleOptions = attributeRules[i];
                rule = this.getRule(ruleOptions.name);

                if (!this._isValidatable(rule, inputValue)) {
                    continue;
                }

                rulePassed = await rule.validate(inputValue, ruleOptions.value, attribute);
                if (!rulePassed) {
                    this._addFailure(rule);
                }

                if (this._shouldStopValidating(attribute, rulePassed)) {
                    break;
                }
            }
        }

        return this.errorCount === 0;
    },

    checkAsync: function (passes, fails) {
        var _this = this;
        passes = passes || function () { };
        fails = fails || function () { };

        var failsOne = function (rule, message) {
            _this._addFailure(rule, message);
        };

        var resolvedAll = function (allPassed) {
            if (allPassed) {
                passes();
            } else {
                fails();
            }
        };

        var asyncResolvers = new AsyncResolvers(failsOne, resolvedAll);

        var validateRule = function (inputValue, ruleOptions, attribute, rule) {
            return function () {
                var resolverIndex = asyncResolvers.add(rule);
                rule.validate(inputValue, ruleOptions.value, attribute, function () {
                    asyncResolvers.resolve(resolverIndex);
                });
            };
        };

        for (var attribute in this.rules) {
            var attributeRules = this.rules[attribute];
            var inputValue = this._objectPath(this.input, attribute);

            if (this._hasRule(attribute, ['sometimes']) && !this._suppliedWithData(attribute)) {
                continue;
            }

            for (var i = 0, len = attributeRules.length, rule, ruleOptions; i < len; i++) {
                ruleOptions = attributeRules[i];

                rule = this.getRule(ruleOptions.name);

                if (!this._isValidatable(rule, inputValue)) {
                    continue;
                }

                validateRule(inputValue, ruleOptions, attribute, rule)();
            }
        }

        asyncResolvers.enableFiring();
        asyncResolvers.fire();
    },

    _addFailure: function (rule) {
        var msg = this.messages.render(rule);
        this.errorBag.add(rule.attribute, msg);
        this.errorCount++;
    },

    _flattenObject: function (obj) {
        var flattened = {};

        function recurse(current, property) {
            if (!property && Object.getOwnPropertyNames(current).length === 0) {
                return;
            }
            if (Object(current) !== current || Array.isArray(current)) {
                flattened[property] = current;
            } else {
                var isEmpty = true;
                for (var p in current) {
                    isEmpty = false;
                    recurse(current[p], property ? property + "." + p : p);
                }
                if (isEmpty) {
                    flattened[property] = {};
                }
            }
        }
        if (obj) {
            recurse(obj);
        }
        return flattened;
    },

    _objectPath: function (obj, path) {
        if (Object.prototype.hasOwnProperty.call(obj, path)) {
            return obj[path];
        }

        var keys = path.replace(/\[(\w+)\]/g, ".$1").replace(/^\./, "").split(".");
        var copy = {};
        for (var attr in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, attr)) {
                copy[attr] = obj[attr];
            }
        }

        for (var i = 0, l = keys.length; i < l; i++) {
            if (Object.hasOwnProperty.call(copy, keys[i])) {
                copy = copy[keys[i]];
            } else {
                return;
            }
        }
        return copy;
    },

    _parseRules: function (rules) {

        var parsedRules = {};
        rules = this._flattenObject(rules);

        for (var attribute in rules) {

            var rulesArray = rules[attribute];

            this._parseRulesCheck(attribute, rulesArray, parsedRules);
        }
        return parsedRules;

    },

    _parseRulesCheck: function (attribute, rulesArray, parsedRules, wildCardValues) {
        if (attribute.indexOf('*') > -1) {
            this._parsedRulesRecurse(attribute, rulesArray, parsedRules, wildCardValues);
        } else {
            this._parseRulesDefault(attribute, rulesArray, parsedRules, wildCardValues);
        }
    },

    _parsedRulesRecurse: function (attribute, rulesArray, parsedRules, wildCardValues) {
        var parentPath = attribute.substr(0, attribute.indexOf('*') - 1);
        var propertyValue = this._objectPath(this.input, parentPath);

        if (propertyValue) {
            for (var propertyNumber = 0; propertyNumber < propertyValue.length; propertyNumber++) {
                var workingValues = wildCardValues ? wildCardValues.slice() : [];
                workingValues.push(propertyNumber);
                this._parseRulesCheck(attribute.replace('*', propertyNumber), rulesArray, parsedRules, workingValues);
            }
        }
    },

    _parseRulesDefault: function (attribute, rulesArray, parsedRules, wildCardValues) {
        var attributeRules = [];

        if (rulesArray instanceof Array) {
            rulesArray = this._prepareRulesArray(rulesArray);
        }

        if (typeof rulesArray === 'string') {
            rulesArray = rulesArray.split('|');
        }

        for (var i = 0, len = rulesArray.length, rule; i < len; i++) {
            rule = typeof rulesArray[i] === 'string' ? this._extractRuleAndRuleValue(rulesArray[i]) : rulesArray[i];
            if (rule.value) {
                rule.value = this._replaceWildCards(rule.value, wildCardValues);
                this._replaceWildCardsMessages(wildCardValues);
            }

            if (Rules.isAsync(rule.name)) {
                this.hasAsync = true;
            }
            attributeRules.push(rule);
        }

        parsedRules[attribute] = attributeRules;
    },

    _replaceWildCards: function (path, nums) {

        if (!nums) {
            return path;
        }

        var path2 = path;
        nums.forEach(function (value) {
            if (Array.isArray(path2)) {
                path2 = path2[0];
            }
            pos = path2.indexOf('*');
            if (pos === -1) {
                return path2;
            }
            path2 = path2.substr(0, pos) + value + path2.substr(pos + 1);
        });
        if (Array.isArray(path)) {
            path[0] = path2;
            path2 = path;
        }
        return path2;
    },

    _replaceWildCardsMessages: function (nums) {
        var customMessages = this.messages.customMessages;
        var self = this;
        Object.keys(customMessages).forEach(function (key) {
            if (nums) {
                var newKey = self._replaceWildCards(key, nums);
                customMessages[newKey] = customMessages[key];
            }
        });

        this.messages._setCustom(customMessages);
    },

    _prepareRulesArray: function (rulesArray) {
        var rules = [];

        for (var i = 0, len = rulesArray.length; i < len; i++) {
            if (typeof rulesArray[i] === 'object') {
                for (var rule in rulesArray[i]) {
                    rules.push({
                        name: rule,
                        value: rulesArray[i][rule]
                    });
                }
            } else {
                rules.push(rulesArray[i]);
            }
        }

        return rules;
    },

    _suppliedWithData: function (attribute) {
        return this.input.hasOwnProperty(attribute);
    },

    _extractRuleAndRuleValue: function (ruleString) {
        var rule = {},
            ruleArray;

        rule.name = ruleString;

        if (ruleString.indexOf(':') >= 0) {
            ruleArray = ruleString.split(':');
            rule.name = ruleArray[0];
            rule.value = ruleArray.slice(1).join(":");
        }

        return rule;
    },

    _hasRule: function (attribute, findRules) {
        var rules = this.rules[attribute] || [];
        for (var i = 0, len = rules.length; i < len; i++) {
            if (findRules.indexOf(rules[i].name) > -1) {
                return true;
            }
        }
        return false;
    },

    _hasNumericRule: function (attribute) {
        return this._hasRule(attribute, this.numericRules);
    },

    _isValidatable: function (rule, value) {
        if (Rules.isImplicit(rule.name)) {
            return true;
        }

        return this.getRule('required').validate(value);
    },

    _shouldStopValidating: function (attribute, rulePassed) {

        var stopOnAttributes = this.stopOnAttributes;
        if (typeof stopOnAttributes === 'undefined' || stopOnAttributes === false || rulePassed === true) {
            return false;
        }

        if (stopOnAttributes instanceof Array) {
            return stopOnAttributes.indexOf(attribute) > -1;
        }

        return true;
    },

    setAttributeNames: function (attributes) {
        this.messages._setAttributeNames(attributes);
    },

    setAttributeFormatter: function (func) {
        this.messages._setAttributeFormatter(func);
    },

    getRule: function (name) {
        return Rules.make(name, this);
    },

    stopOnError: function (attributes) {
        this.stopOnAttributes = attributes;
    },

    passes: function (passes) {
        var async = this._checkAsync('passes', passes);
        if (async) {
            return this.checkAsync(passes);
        }
        return this.check();
    },

    fails: async function (fails) {
        var async = this._checkAsync('fails', fails);
        if (async) {
            return this.checkAsync(function () { }, fails);
        }
        return !await this.check();
    },

    _checkAsync: function (funcName, callback) {
        var hasCallback = typeof callback === 'function';
        if (this.hasAsync && !hasCallback) {
            throw funcName + ' expects a callback when async rules are being tested.';
        }

        return this.hasAsync || hasCallback;
    }

};

Validator.setMessages = function (lang, messages) {
    Lang._set(lang, messages);
    return this;
};

Validator.getMessages = function (lang) {
    return Lang._get(lang);
};

Validator.useLang = function (lang) {
    this.prototype.lang = lang;
};

Validator.getDefaultLang = function () {
    return this.prototype.lang;
};

Validator.setAttributeFormatter = function (func) {
    this.prototype.attributeFormatter = func;
};

Validator.stopOnError = function (attributes) {
    this.prototype.stopOnAttributes = attributes;
};

Validator.register = function (name, fn, message) {
    var lang = Validator.getDefaultLang();
    Rules.register(name, fn);
    Lang._setRuleMessage(lang, name, message);
};

Validator.registerImplicit = function (name, fn, message) {
    var lang = Validator.getDefaultLang();
    Rules.registerImplicit(name, fn);
    Lang._setRuleMessage(lang, name, message);
};

Validator.registerAsync = function (name, fn, message) {
    var lang = Validator.getDefaultLang();
    Rules.registerAsync(name, fn);
    Lang._setRuleMessage(lang, name, message);
};

Validator.registerAsyncImplicit = function (name, fn, message) {
    var lang = Validator.getDefaultLang();
    Rules.registerAsyncImplicit(name, fn);
    Lang._setRuleMessage(lang, name, message);
};

Validator.registerMissedRuleValidator = function (fn, message) {
    Rules.registerMissedRuleValidator(fn, message);
};

module.exports = Validator;
