import fileType from 'file-type';
import File from '@ostro/contracts/container/file';
import Database from '@ostro/support/facades/database';

/**
 * Determine if a year is a leap year.
 *
 * @param year - The year to test
 * @returns Whether the year is a leap year
 */
function leapYear(year: number): boolean {
    return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
}

/**
 * Extract file extension and MIME type details.
 *
 * @param val - The file or buffer object
 * @returns Object with extension and mime
 */
async function fileDetails(val: any): Promise<{ ext: string | null; mime: string | null }> {
    const buf = typeof val.getBufferData === 'function' ? val.getBufferData() : val.buffer;
    let detected: any = null;
    if (typeof fileType === 'function') {
        detected = (fileType as any)(buf);
    } else if (fileType && typeof (fileType as any).fromBuffer === 'function') {
        detected = await (fileType as any).fromBuffer(buf);
    }
    return detected || {
        ext: typeof val.getExtension === 'function' ? val.getExtension() : null,
        mime: typeof val.getMimetype === 'function' ? val.getMimetype() : null
    };
}

/**
 * Determine if an object is an instance of File.
 *
 * @param obj - The object to test
 * @returns Whether obj is File
 */
function isFile(obj: any = {}): boolean {
    return (obj instanceof File);
}

/**
 * Validate whether a date value represents a valid date.
 *
 * @param inDate - The date input to validate
 * @returns Whether the date is valid
 */
function isValidDate(inDate: any): boolean {
    const valid = true;

    if (typeof inDate === 'string') {
        const pos = inDate.indexOf('.');
        if ((pos > 0 && pos <= 6)) {
            inDate = inDate.replace(/\./g, '-');
        }
    }

    const testDate = new Date(inDate);
    const yr = testDate.getFullYear();
    const mo = testDate.getMonth();
    const day = testDate.getDate();

    const daysInMonth = [31, (leapYear(yr) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

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

const rules: Record<string, (this: Rule, ...args: any[]) => any> = {

    required(this: Rule, val: any): boolean {
        let str: string;

        if (val === undefined || val === null) {
            return false;
        }

        str = String(val).replace(/\s/g, '');
        return str.length > 0 ? true : false;
    },

    required_if(this: Rule, val: any, req: any, attribute: string): boolean {
        req = this.getParameters();
        if (this.validator._objectPath(this.validator.input, req[0]) === req[1]) {
            return this.validator.getRule('required').validate(val);
        }

        return true;
    },

    required_unless(this: Rule, val: any, req: any, attribute: string): boolean {
        req = this.getParameters();
        if (this.validator._objectPath(this.validator.input, req[0]) !== req[1]) {
            return this.validator.getRule('required').validate(val);
        }

        return true;
    },

    required_with(this: Rule, val: any, req: any, attribute: string): boolean {
        if (this.validator._objectPath(this.validator.input, req)) {
            return this.validator.getRule('required').validate(val);
        }

        return true;
    },

    required_with_all(this: Rule, val: any, req: any, attribute: string): boolean {
        req = this.getParameters();

        for (let i = 0; i < req.length; i++) {
            if (!this.validator._objectPath(this.validator.input, req[i])) {
                return true;
            }
        }

        return this.validator.getRule('required').validate(val);
    },

    required_without(this: Rule, val: any, req: any, attribute: string): boolean {
        if (this.validator._objectPath(this.validator.input, req)) {
            return true;
        }

        return this.validator.getRule('required').validate(val);
    },

    required_without_all(this: Rule, val: any, req: any, attribute: string): boolean {
        req = this.getParameters();

        for (let i = 0; i < req.length; i++) {
            if (this.validator._objectPath(this.validator.input, req[i])) {
                return true;
            }
        }

        return this.validator.getRule('required').validate(val);
    },

    'boolean'(this: Rule, val: any): boolean {
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

    size(this: Rule, val: any, req: any, attribute: string): boolean {
        if (val) {
            const parsedReq = parseFloat(req);
            const size = this.getSize();
            return size === parsedReq;
        }

        return true;
    },

    string(this: Rule, val: any, req?: any, attribute?: string): boolean {
        return typeof val === 'string';
    },

    sometimes(this: Rule, val: any): boolean {
        return true;
    },

    min(this: Rule, val: any, req: any, attribute: string): boolean {
        const size = this.getSize();
        return size >= req;
    },

    max(this: Rule, val: any, req: any, attribute: string): boolean {
        const size = this.getSize();
        return size <= req;
    },

    between(this: Rule, val: any, req?: any, attribute?: string): boolean {
        const params = this.getParameters();
        const size = this.getSize();
        const min = parseFloat(params[0]);
        const max = parseFloat(params[1]);
        return size >= min && size <= max;
    },

    email(this: Rule, val: any): boolean {
        const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(val);
    },

    numeric(this: Rule, val: any): boolean {
        const num = Number(val);

        if (typeof num === 'number' && !isNaN(num) && typeof val !== 'boolean') {
            return true;
        } else {
            return false;
        }
    },

    array(this: Rule, val: any): boolean {
        return val instanceof Array;
    },

    object(this: Rule, val: any): boolean {
        return typeof val === 'object';
    },

    url(this: Rule, url: any): boolean {
        return (/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-z]{2,63}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/i).test(url);
    },

    alpha(this: Rule, val: any): boolean {
        return (/^[a-zA-Z]+$/).test(val);
    },

    alpha_dash(this: Rule, val: any): boolean {
        return (/^[a-zA-Z0-9_\-]+$/).test(val);
    },

    alpha_num(this: Rule, val: any): boolean {
        return (/^[a-zA-Z0-9]+$/).test(val);
    },

    same(this: Rule, val: any, req: string): boolean {
        const val1 = this.validator._flattenObject(this.validator.input)[req];
        const val2 = val;

        if (val1 === val2) {
            return true;
        }

        return false;
    },

    different(this: Rule, val: any, req: string): boolean {
        const val1 = this.validator._flattenObject(this.validator.input)[req];
        const val2 = val;

        if (val1 !== val2) {
            return true;
        }

        return false;
    },

    'in'(this: Rule, val: any, req?: any): boolean {
        let list: any[];
        let i: number;

        if (val) {
            list = this.getParameters();
        }

        if (val && !(val instanceof Array)) {
            let localValue = val;

            for (i = 0; i < list!.length; i++) {
                if (typeof list![i] === 'string') {
                    localValue = String(val);
                }

                if (localValue === list![i]) {
                    return true;
                }
            }

            return false;
        }

        if (val && val instanceof Array) {
            for (i = 0; i < val.length; i++) {
                if (list!.indexOf(val[i]) < 0) {
                    return false;
                }
            }
        }

        return true;
    },

    not_in(this: Rule, val: any, req?: any): boolean {
        const list = this.getParameters();
        const len = list.length;
        let returnVal = true;

        for (let i = 0; i < len; i++) {
            let localValue = val;

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

    accepted(this: Rule, val: any): boolean {
        if (val === 'on' || val === 'yes' || val === 1 || val === '1' || val === true) {
            return true;
        }

        return false;
    },

    confirmed(this: Rule, val: any, req: any, key: string): boolean {
        const confirmedKey = key + '_confirmation';

        if (this.validator.input[confirmedKey] === val) {
            return true;
        }

        return false;
    },

    integer(this: Rule, val: any): boolean {
        return String(parseInt(val, 10)) === String(val);
    },

    digits(this: Rule, val: any, req: any): boolean {
        const numericRule = this.validator.getRule('numeric');
        if (numericRule.validate(val) && String(val).length === parseInt(req, 10)) {
            return true;
        }

        return false;
    },

    regex(this: Rule, val: any, req: any): boolean {
        const mod = /[g|i|m]{1,3}$/;
        let flag = req.match(mod);
        flag = flag ? flag[0] : '';
        req = req.replace(mod, '').slice(1, -1);
        const regexp = new RegExp(req, flag);
        return !!regexp.test(val);
    },

    date(this: Rule, val: any, format?: any): boolean {
        return isValidDate(val);
    },

    present(this: Rule, val: any): boolean {
        return typeof val !== 'undefined';
    },

    async exists(this: Rule, val: any): Promise<boolean> {
        const [table, column] = this.getParameters();
        const values = Array.isArray(val) ? val : [val];
        const exists = await Database.table(table).whereIn(column, values).exists();

        if (!exists) {
            return false;
        }
        return true;
    },

    async not_exists(this: Rule, val: any): Promise<boolean> {
        const [table, column] = this.getParameters();
        const values = Array.isArray(val) ? val : [val];
        const exists = await Database.table(table).whereIn(column, values).exists();

        if (!exists) {
            return true;
        }
        return false;
    },

    after(this: Rule, val: any, req: string): boolean {
        const val1 = this.validator.input[req];
        const val2 = val;

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

    after_or_equal(this: Rule, val: any, req: string): boolean {
        const val1 = this.validator.input[req];
        const val2 = val;

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

    before(this: Rule, val: any, req: string): boolean {
        const val1 = this.validator.input[req];
        const val2 = val;

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

    before_or_equal(this: Rule, val: any, attributes: string): boolean {
        const val1 = this.validator.input[attributes];
        const val2 = val;

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

    hex(this: Rule, val: any): boolean {
        return (/^[0-9a-f]+$/i).test(val);
    },

    file(this: Rule, val: any): boolean {
        return isFile(val);
    },

    async mimes(this: Rule, val: any, attributes: string): Promise<boolean> {
        try {
            const filetype = await fileDetails(val);
            return attributes.split(',').includes(filetype.ext as string);
        } catch (e) {
            return false;
        }
    },

    async mimetypes(this: Rule, val: any, attributes: string): Promise<boolean> {
        try {
            const filetype = await fileDetails(val);
            const mimetypes = attributes.split(',');
            if (mimetypes.includes(filetype.mime as string)) {
                return true;
            }
            for (let i = 0; i < mimetypes.length; i++) {
                if (mimetypes[i].endsWith('/*')) {
                    const typePrefix = mimetypes[i].split('/')[0];
                    const filePrefix = (filetype.mime as string).split('/')[0];
                    if (typePrefix === filePrefix) {
                        return true;
                    }
                }
            }
            return false;
        } catch (e) {
            return false;
        }
    },

    json(this: Rule, val: any): boolean {
        return typeof val === 'object' && !Array.isArray(val);
    },

    /**
     * json_string method.
     *
     * @param val - The value to test
     * @returns Whether value is a valid JSON string
     */
    json_string(this: Rule, val: any): boolean {
        try {
            JSON.parse(val);
            return true;
        } catch (e) {
            return false;
        }
    }
};

let missedRuleValidator: (this: Rule, ...args: any[]) => any = function (this: Rule) {
    throw new Error('Validator `' + this.name + '` is not defined!');
};
let missedRuleMessage: string | undefined;

/**
 * Class Rule.
 */
class Rule {
    public name: string;
    public fn: Function;
    public passes: boolean | null;
    public _customMessage?: string;
    public async?: boolean;
    public attribute?: string;
    public inputValue?: any;
    public ruleValue?: any;
    public callback?: (passes: boolean, message?: string) => void;
    public validator?: any;

    /**
     * Create a new Rule instance.
     *
     * @param name - The rule name
     * @param fn - The rule implementation function
     * @param async - Whether the rule is asynchronous
     */
    constructor(name: string, fn: Function, async?: boolean) {
        this.name = name;
        this.fn = fn;
        this.passes = null;
        this._customMessage = undefined;
        this.async = async;
    }

    /**
     * Validate the given input value against this rule.
     *
     * @param inputValue - The value to validate
     * @param ruleValue - The rule parameter(s)
     * @param attribute - The attribute name
     * @param callback - Optional async completion callback
     * @returns Result or Promise of validation
     */
    public validate(inputValue: any, ruleValue?: any, attribute?: string, callback?: (passes: boolean, message?: string) => void): any {
        this._setValidatingData(attribute, inputValue, ruleValue);
        if (typeof callback === 'function') {
            this.callback = callback;
            const handleResponse = (passes?: boolean, message?: string) => {
                this.response(passes, message);
            };

            if (this.async) {
                const res = this._apply(inputValue, ruleValue, attribute, handleResponse);
                if (res && typeof res.then === 'function') {
                    return res.then(handleResponse, function () { handleResponse(false); });
                }
                return res;
            } else {
                return handleResponse(this._apply(inputValue, ruleValue, attribute));
            }
        }
        return this._apply(inputValue, ruleValue, attribute);
    }

    /**
     * Apply the rule validator function.
     *
     * @param inputValue - The value being validated
     * @param ruleValue - The rule parameter
     * @param attribute - The attribute name
     * @param callback - Optional callback
     * @returns The validator function return value
     */
    public _apply(inputValue: any, ruleValue?: any, attribute?: string, callback?: (passes?: boolean, message?: string) => void): any {
        const fn = this.isMissed() ? missedRuleValidator : this.fn;
        return fn.apply(this, [inputValue, ruleValue, attribute, callback]);
    }

    /**
     * Store metadata for the current validation run.
     *
     * @param attribute - The attribute name
     * @param inputValue - The value being validated
     * @param ruleValue - The rule parameter
     */
    public _setValidatingData(attribute?: string, inputValue?: any, ruleValue?: any): void {
        this.attribute = attribute;
        this.inputValue = inputValue;
        this.ruleValue = ruleValue;
    }

    /**
     * Parse and return rule parameters as an array.
     *
     * @returns Array of parameters
     */
    public getParameters(): any[] {
        let value: any[] = [];

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
    }

    /**
     * Calculate the size of the input value based on its type.
     *
     * @returns Size as a number
     */
    public getSize(): number {
        const value = this.inputValue;

        if (value instanceof Array) {
            return value.length;
        }
        if (value instanceof File) {
            return (value as any).buffer?.length ? (value as any).buffer.length / 1024 : 0;
        }

        if (typeof value === 'number') {
            return value;
        }

        if (this.validator._hasNumericRule(this.attribute)) {
            return parseFloat(value);
        }

        return value.length;
    }

    /**
     * Determine the value type (numeric or string) for message interpolation.
     *
     * @returns 'numeric' | 'string'
     */
    public _getValueType(): 'numeric' | 'string' {
        if (typeof this.inputValue === 'number' || this.validator._hasNumericRule(this.attribute)) {
            return 'numeric';
        }

        return 'string';
    }

    /**
     * Record validation response and trigger callback.
     *
     * @param passes - Whether validation passed
     * @param message - Optional custom failure message
     */
    public response(passes?: boolean, message?: string): void {
        this.passes = (passes === undefined || passes === true);
        this._customMessage = message;
        if (this.callback) {
            this.callback(this.passes, message);
        }
    }

    /**
     * Set the parent Validator instance.
     *
     * @param validator - The Validator instance
     */
    public setValidator(validator: any): void {
        this.validator = validator;
    }

    /**
     * Determine whether this rule has an implementation.
     *
     * @returns Whether rule function is missing
     */
    public isMissed(): boolean {
        return typeof this.fn !== 'function';
    }

    /**
     * Get custom error message if defined.
     *
     * @returns Custom error message
     */
    public get customMessage(): string | undefined {
        return this.isMissed() ? missedRuleMessage : this._customMessage;
    }
}

interface RuleManager {
    asyncRules: string[];
    implicitRules: string[];
    make(name: string, validator: any): Rule;
    isAsync(name: string): boolean;
    isImplicit(name: string): boolean;
    register(name: string, fn: (this: Rule, ...args: any[]) => any): void;
    registerImplicit(name: string, fn: (this: Rule, ...args: any[]) => any): void;
    registerAsync(name: string, fn: (this: Rule, ...args: any[]) => any): void;
    registerAsyncImplicit(name: string, fn: (this: Rule, ...args: any[]) => any): void;
    registerMissedRuleValidator(fn: (this: Rule, ...args: any[]) => any, message?: string): void;
}

const manager: RuleManager = {

    asyncRules: ['exists', 'not_exists', 'mimes', 'mimetypes'],

    implicitRules: ['required', 'required_if', 'required_unless', 'required_with', 'required_with_all', 'required_without', 'required_without_all', 'accepted', 'present'],

    /**
     * Create a Rule instance for a given rule name.
     *
     * @param name - The rule name
     * @param validator - The validator instance
     * @returns A new Rule instance
     */
    make(name: string, validator: any): Rule {
        const async = this.isAsync(name);
        const rule = new Rule(name, rules[name], async);
        rule.setValidator(validator);
        return rule;
    },

    /**
     * Check if a rule is asynchronous.
     *
     * @param name - The rule name
     * @returns Whether the rule is async
     */
    isAsync(name: string): boolean {
        for (let i = 0, len = this.asyncRules.length; i < len; i++) {
            if (this.asyncRules[i] === name) {
                return true;
            }
        }
        return false;
    },

    /**
     * Check if a rule is implicit.
     *
     * @param name - The rule name
     * @returns Whether the rule is implicit
     */
    isImplicit(name: string): boolean {
        return this.implicitRules.indexOf(name) > -1;
    },

    /**
     * Register a new rule.
     *
     * @param name - The rule name
     * @param fn - The rule implementation function
     */
    register(name: string, fn: (this: Rule, ...args: any[]) => any): void {
        rules[name] = fn;
    },

    /**
     * Register a new implicit rule.
     *
     * @param name - The rule name
     * @param fn - The rule implementation function
     */
    registerImplicit(name: string, fn: (this: Rule, ...args: any[]) => any): void {
        this.register(name, fn);
        this.implicitRules.push(name);
    },

    /**
     * Register an asynchronous rule.
     *
     * @param name - The rule name
     * @param fn - The async rule implementation function
     */
    registerAsync(name: string, fn: (this: Rule, ...args: any[]) => any): void {
        this.register(name, fn);
        this.asyncRules.push(name);
    },

    /**
     * Register an asynchronous implicit rule.
     *
     * @param name - The rule name
     * @param fn - The async rule implementation function
     */
    registerAsyncImplicit(name: string, fn: (this: Rule, ...args: any[]) => any): void {
        this.registerImplicit(name, fn);
        this.asyncRules.push(name);
    },

    /**
     * Register a fallback handler for undefined rules.
     *
     * @param fn - The fallback function
     * @param message - The fallback error message
     */
    registerMissedRuleValidator(fn: (this: Rule, ...args: any[]) => any, message?: string): void {
        missedRuleValidator = fn;
        missedRuleMessage = message;
    }
};

export default manager;
