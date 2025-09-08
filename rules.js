var fileType = require('file-type');
const File = require('@ostro/contracts/container/file')
const Database = require('@ostro/support/facades/database')
function leapYear(year) {
    return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
}

async function fileDetails(val) {
    return (await fileType.fromBuffer(val.getBufferData())) || { ext: val.getExtension(), mime: val.getMimetype() }
}

function isFile(obj = {}) {
    return (obj instanceof File)
}

function isValidDate(inDate) {
    var valid = true;

    if (typeof inDate === 'string') {
        var pos = inDate.indexOf('.');
        if ((pos > 0 && pos <= 6)) {
            inDate = inDate.replace(/\./g, '-');
        }
    }

    var testDate = new Date(inDate);
    var yr = testDate.getFullYear();
    var mo = testDate.getMonth();
    var day = testDate.getDate();

    var daysInMonth = [31, (leapYear(yr) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    if (yr < 1000) {
        return false;
    }
    if (isNaN(mo)) {
        return false;
    }
    if (mo + 1 > 12) {
        return false;
    }
    if (isNaN(day)) {
        return false;
    }
    if (day > daysInMonth[mo]) {
        return false;
    }

    return valid;
}

var rules = {

    required: function (val) {
        var str;

        if (val === undefined || val === null) {
            return false;
        }

        str = String(val).replace(/\s/g, "");
        return str.length > 0 ? true : false;
    },

    required_if: function (val, req, attribute) {
        req = this.getParameters();
        if (this.validator._objectPath(this.validator.input, req[0]) === req[1]) {
            return this.validator.getRule('required').validate(val);
        }

        return true;
    },

    required_unless: function (val, req, attribute) {
        req = this.getParameters();
        if (this.validator._objectPath(this.validator.input, req[0]) !== req[1]) {
            return this.validator.getRule('required').validate(val);
        }

        return true;
    },

    required_with: function (val, req, attribute) {
        if (this.validator._objectPath(this.validator.input, req)) {
            return this.validator.getRule('required').validate(val);
        }

        return true;
    },

    required_with_all: function (val, req, attribute) {

        req = this.getParameters();

        for (var i = 0; i < req.length; i++) {
            if (!this.validator._objectPath(this.validator.input, req[i])) {
                return true;
            }
        }

        return this.validator.getRule('required').validate(val);
    },

    required_without: function (val, req, attribute) {

        if (this.validator._objectPath(this.validator.input, req)) {
            return true;
        }

        return this.validator.getRule('required').validate(val);
    },

    required_without_all: function (val, req, attribute) {

        req = this.getParameters();

        for (var i = 0; i < req.length; i++) {
            if (this.validator._objectPath(this.validator.input, req[i])) {
                return true;
            }
        }

        return this.validator.getRule('required').validate(val);
    },

    'boolean': function (val) {
        return (
            val === true ||
            val === false ||
            val === 0 ||
            val === 1 ||
            val === '0' ||
            val === '1' ||
            val === 'true' ||
            val === 'false'
        );
    },

    size: function (val, req, attribute) {
        if (val) {
            req = parseFloat(req);

            var size = this.getSize();

            return size === req;
        }

        return true;
    },

    string: function (val, req, attribute) {
        return typeof val === 'string';
    },

    sometimes: function (val) {
        return true;
    },

    min: function (val, req, attribute) {
        var size = this.getSize();
        return size >= req;
    },

    max: function (val, req, attribute) {
        var size = this.getSize();
        return size <= req;
    },

    between: function (val, req, attribute) {
        req = this.getParameters();
        var size = this.getSize();
        var min = parseFloat(req[0], 10);
        var max = parseFloat(req[1], 10);
        return size >= min && size <= max;
    },

    email: function (val) {
        var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(val);
    },

    numeric: function (val) {
        let num = Number(val);

        if (typeof num === 'number' && !isNaN(num) && typeof val !== 'boolean') {
            return true;
        } else {
            return false;
        }
    },

    array: function (val) {
        return val instanceof Array;
    },

    object: function (val) {
        return typeof val == 'object';
    },

    url: function (url) {
        return (/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-z]{2,63}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/i).test(url);
    },

    alpha: function (val) {
        return (/^[a-zA-Z]+$/).test(val);
    },

    alpha_dash: function (val) {
        return (/^[a-zA-Z0-9_\-]+$/).test(val);
    },

    alpha_num: function (val) {
        return (/^[a-zA-Z0-9]+$/).test(val);
    },

    same: function (val, req) {
        var val1 = this.validator._flattenObject(this.validator.input)[req];
        var val2 = val;

        if (val1 === val2) {
            return true;
        }

        return false;
    },

    different: function (val, req) {
        var val1 = this.validator._flattenObject(this.validator.input)[req];
        var val2 = val;

        if (val1 !== val2) {
            return true;
        }

        return false;
    },

    "in": function (val, req) {
        var list, i;

        if (val) {
            list = this.getParameters();
        }

        if (val && !(val instanceof Array)) {
            var localValue = val;

            for (i = 0; i < list.length; i++) {
                if (typeof list[i] === 'string') {
                    localValue = String(val);
                }

                if (localValue === list[i]) {
                    return true;
                }
            }

            return false;
        }

        if (val && val instanceof Array) {
            for (i = 0; i < val.length; i++) {
                if (list.indexOf(val[i]) < 0) {
                    return false;
                }
            }
        }

        return true;
    },

    not_in: function (val, req) {
        var list = this.getParameters();
        var len = list.length;
        var returnVal = true;

        for (var i = 0; i < len; i++) {
            var localValue = val;

            if (typeof list[i] === 'string') {
                localValue = String(val);
            }

            if (localValue === list[i]) {
                returnVal = false;
                break;
            }
        }

        return returnVal;
    },

    accepted: function (val) {
        if (val === 'on' || val === 'yes' || val === 1 || val === '1' || val === true) {
            return true;
        }

        return false;
    },

    confirmed: function (val, req, key) {
        var confirmedKey = key + '_confirmation';

        if (this.validator.input[confirmedKey] === val) {
            return true;
        }

        return false;
    },

    integer: function (val) {
        return String(parseInt(val, 10)) === String(val);
    },

    digits: function (val, req) {
        var numericRule = this.validator.getRule('numeric');
        if (numericRule.validate(val) && String(val).length === parseInt(req)) {
            return true;
        }

        return false;
    },

    regex: function (val, req) {
        var mod = /[g|i|m]{1,3}$/;
        var flag = req.match(mod);
        flag = flag ? flag[0] : "";
        req = req.replace(mod, "").slice(1, -1);
        req = new RegExp(req, flag);
        return !!req.test(val);
    },

    date: function (val, format) {
        return isValidDate(val);
    },

    present: function (val) {
        return typeof val !== 'undefined';
    },

    exists: async function (val) {
        var [table, column] = this.getParameters();
        var values = Array.isArray(val) ? val : [val];
        const exists = await Database.table(table).whereIn(column, values).exists()

        if (!exists) {
            return false;
        }
        return true;
    },
    not_exists: async function (val) {
         var [table, column] = this.getParameters();
        var values = Array.isArray(val) ? val : [val];
        const exists = await Database.table(table).whereIn(column, values).exists()

        if (!exists) {
            return true;
        }
        return false;
    },

    after: function (val, req) {
        var val1 = this.validator.input[req];
        var val2 = val;

        if (!isValidDate(val1)) {
            return false;
        }
        if (!isValidDate(val2)) {
            return false;
        }

        if (new Date(val1).getTime() < new Date(val2).getTime()) {
            return true;
        }

        return false;
    },

    after_or_equal: function (val, req) {
        var val1 = this.validator.input[req];
        var val2 = val;

        if (!isValidDate(val1)) {
            return false;
        }
        if (!isValidDate(val2)) {
            return false;
        }

        if (new Date(val1).getTime() <= new Date(val2).getTime()) {
            return true;
        }

        return false;
    },

    before: function (val, req) {
        var val1 = this.validator.input[req];
        var val2 = val;

        if (!isValidDate(val1)) {
            return false;
        }
        if (!isValidDate(val2)) {
            return false;
        }

        if (new Date(val1).getTime() > new Date(val2).getTime()) {
            return true;
        }

        return false;
    },

    before_or_equal: function (val, attributes) {
        var val1 = this.validator.input[attributes];
        var val2 = val;

        if (!isValidDate(val1)) {
            return false;
        }
        if (!isValidDate(val2)) {
            return false;
        }

        if (new Date(val1).getTime() >= new Date(val2).getTime()) {
            return true;
        }

        return false;
    },

    hex: function (val) {
        return (/^[0-9a-f]+$/i).test(val);
    },

    file: function (val) {
        return isFile(val)
    },

    mimes: async function (val, attributes) {
        try {
            let filetype = await fileDetails(val)
            return attributes.split(',').includes(filetype.ext)
        } catch (e) {
            return false
        }
    },

    mimetypes: async function (val, attributes) {
        try {
            let filetype = await fileDetails(val)
            let mimetypes = attributes.split(',')
            if (mimetypes.includes(filetype.mime)) {
                return true
            }
            if (mimetypes.includes('*')) {
                let fileMime = filetype.mime.split('/')
                if (fileMime[0] == mimetypes[i].split('/')[0]) {
                    return true
                }
            }
            return false
        } catch (e) {
            return false
        }

    },

    json: function (val) {
        return typeof val == 'object' && !Array.isArray(val)
    },

    json_string(val) {
        try {
            JSON.parse(val)
            return true
        } catch (e) {
            return false
        }
    }
};

var missedRuleValidator = function () {
    throw new Error('Validator `' + this.name + '` is not defined!');
};
var missedRuleMessage;

function Rule(name, fn, async) {
    this.name = name;
    this.fn = fn;
    this.passes = null;
    this._customMessage = undefined;
    this.async = async;
}

Rule.prototype = {

    validate: function (inputValue, ruleValue, attribute, callback) {
        var _this = this;
        this._setValidatingData(attribute, inputValue, ruleValue);
        if (typeof callback === 'function') {
            this.callback = callback;
            var handleResponse = function (passes, message) {
                _this.response(passes, message);
            };

            if (this.async) {
                return this._apply(inputValue, ruleValue, attribute, handleResponse);
            } else {
                return handleResponse(this._apply(inputValue, ruleValue, attribute));
            }
        }
        return this._apply(inputValue, ruleValue, attribute);
    },

    _apply: function (inputValue, ruleValue, attribute, callback) {
        var fn = this.isMissed() ? missedRuleValidator : this.fn;

        return fn.apply(this, [inputValue, ruleValue, attribute, callback]);
    },

    _setValidatingData: function (attribute, inputValue, ruleValue) {
        this.attribute = attribute;
        this.inputValue = inputValue;
        this.ruleValue = ruleValue;
    },

    getParameters: function () {
        var value = [];

        if (typeof this.ruleValue === 'string') {
            value = this.ruleValue.split(',');
        }

        if (typeof this.ruleValue === 'number') {
            value.push(this.ruleValue);
        }

        if (this.ruleValue instanceof Array) {
            value = this.ruleValue;
        }

        return value;
    },

    getSize: function () {
        var value = this.inputValue;

        if (value instanceof Array) {
            return value.length;
        }
        if (value instanceof File) {
            return value.buffer.length / 1024;
        }

        if (typeof value === 'number') {
            return value;
        }

        if (this.validator._hasNumericRule(this.attribute)) {
            return parseFloat(value, 10);
        }

        return value.length;
    },

    _getValueType: function () {
        if (typeof this.inputValue === 'number' || this.validator._hasNumericRule(this.attribute)) {
            return 'numeric';
        }

        return 'string';
    },

    response: function (passes, message) {
        this.passes = (passes === undefined || passes === true);
        this._customMessage = message;
        this.callback(this.passes, message);
    },

    setValidator: function (validator) {
        this.validator = validator;
    },

    isMissed: function () {
        return typeof this.fn !== 'function';
    },

    get customMessage() {
        return this.isMissed() ? missedRuleMessage : this._customMessage;
    }
};

var manager = {

    asyncRules: [],

    implicitRules: ['required', 'required_if', 'required_unless', 'required_with', 'required_with_all', 'required_without', 'required_without_all', 'accepted', 'present'],

    make: function (name, validator) {
        var async = this.isAsync(name);
        var rule = new Rule(name, rules[name], async);
        rule.setValidator(validator);
        return rule;
    },

    isAsync: function (name) {
        for (var i = 0, len = this.asyncRules.length; i < len; i++) {
            if (this.asyncRules[i] === name) {
                return true;
            }
        }
        return false;
    },

    isImplicit: function (name) {
        return this.implicitRules.indexOf(name) > -1;
    },

    register: function (name, fn) {
        rules[name] = fn;
    },

    registerImplicit: function (name, fn) {
        this.register(name, fn);
        this.implicitRules.push(name);
    },

    registerAsync: function (name, fn) {
        this.register(name, fn);
        this.asyncRules.push(name);
    },

    registerAsyncImplicit: function (name, fn) {
        this.registerImplicit(name, fn);
        this.asyncRules.push(name);
    },

    registerMissedRuleValidator: function (fn, message) {
        missedRuleValidator = fn;
        missedRuleMessage = message;
    }
};

module.exports = manager;
