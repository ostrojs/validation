import '@ostro/support/helpers';
import Rules from './rules';
import Lang from './lang';
import Attributes from './attributes';
import AsyncResolvers from './async';
import ValidationException from './validationException';

/**
 * Class Validator.
 */
class Validator {
    declare public lang: string;
    declare public numericRules: string[];
    declare public attributeFormatter: (attribute: string) => string;
    declare public stopOnAttributes: any;

    public input: Record<string, any>;
    public messages: any;
    public errorBag: ValidationException;
    public errorCount: number;
    public hasAsync: boolean;
    public rules: Record<string, any[]>;

    /**
     * Create a new Validator instance.
     *
     * @param input - The inputs to validate
     * @param rules - The validation rules
     * @param customMessages - Custom error messages map
     */
    constructor(input?: any, rules?: any, customMessages?: Record<string, any>) {
        const lang = Validator.getDefaultLang();
        this.input = input || {};

        this.messages = Lang._make(lang);
        this.messages._setCustom(customMessages);
        this.setAttributeFormatter(Validator.prototype.attributeFormatter);

        this.errorBag = new ValidationException();
        this.errorCount = 0;

        this.hasAsync = false;
        this.rules = this._parseRules(rules);
    }

    /**
     * Get the error bag containing all validation errors.
     *
     * @returns The ValidationException instance
     */
    public errors(): ValidationException {
        return this.errorBag;
    }

    /**
     * Run all synchronous and asynchronous validation rules.
     *
     * @returns Promise resolving to whether validation passed
     */
    public async check(): Promise<boolean> {
        for (const attribute in this.rules) {
            const attributeRules = this.rules[attribute];
            const inputValue = this._objectPath(this.input, attribute);

            if (this._hasRule(attribute, ['sometimes']) && !this._suppliedWithData(attribute)) {
                continue;
            }

            for (let i = 0, len = attributeRules.length; i < len; i++) {
                const ruleOptions = attributeRules[i];
                const rule = this.getRule(ruleOptions.name);

                if (!this._isValidatable(rule, inputValue)) {
                    continue;
                }

                const rulePassed = await rule.validate(inputValue, ruleOptions.value, attribute);
                if (!rulePassed) {
                    this._addFailure(rule);
                }

                if (this._shouldStopValidating(attribute, rulePassed)) {
                    break;
                }
            }
        }

        return this.errorCount === 0;
    }

    /**
     * Run validation asynchronously with completion callbacks.
     *
     * @param passes - Callback when all rules pass
     * @param fails - Callback when any rule fails
     */
    public checkAsync(passes?: () => void, fails?: () => void): void {
        const passesCb = passes || function () {};
        const failsCb = fails || function () {};

        const failsOne = (rule: any, message?: string) => {
            this._addFailure(rule, message);
        };

        const resolvedAll = (allPassed: boolean) => {
            if (allPassed) {
                passesCb();
            } else {
                failsCb();
            }
        };

        const asyncResolvers = new AsyncResolvers(failsOne, resolvedAll);

        const validateRule = (inputValue: any, ruleOptions: any, attribute: string, rule: any) => {
            return () => {
                const resolverIndex = asyncResolvers.add(rule);
                rule.validate(inputValue, ruleOptions.value, attribute, () => {
                    asyncResolvers.resolve(resolverIndex);
                });
            };
        };

        for (const attribute in this.rules) {
            const attributeRules = this.rules[attribute];
            const inputValue = this._objectPath(this.input, attribute);

            if (this._hasRule(attribute, ['sometimes']) && !this._suppliedWithData(attribute)) {
                continue;
            }

            for (let i = 0, len = attributeRules.length; i < len; i++) {
                const ruleOptions = attributeRules[i];
                const rule = this.getRule(ruleOptions.name);

                if (!this._isValidatable(rule, inputValue)) {
                    continue;
                }

                validateRule(inputValue, ruleOptions, attribute, rule)();
            }
        }

        asyncResolvers.enableFiring();
        asyncResolvers.fire();
    }

    /**
     * Add a validation failure for a rule.
     *
     * @param rule - The rule that failed
     * @param message - Optional custom failure message
     */
    public _addFailure(rule: any, message?: string): void {
        const msg = this.messages.render(rule);
        this.errorBag.add(rule.attribute, msg);
        this.errorCount++;
    }

    /**
     * Flatten nested object keys into dot notation.
     *
     * @param obj - The object to flatten
     * @returns The flattened object
     */
    public _flattenObject(obj: any): Record<string, any> {
        const flattened: Record<string, any> = {};

        function recurse(current: any, property?: string): void {
            if (!property && Object.getOwnPropertyNames(current).length === 0) {
                return;
            }
            if (Object(current) !== current || Array.isArray(current)) {
                flattened[property!] = current;
            } else {
                let isEmpty = true;
                for (const p in current) {
                    isEmpty = false;
                    recurse(current[p], property ? property + '.' + p : p);
                }
                if (isEmpty) {
                    flattened[property!] = {};
                }
            }
        }
        if (obj) {
            recurse(obj);
        }
        return flattened;
    }

    /**
     * Get value from nested object using dot or bracket path.
     *
     * @param obj - The object
     * @param path - The path string
     * @returns The resolved value
     */
    public _objectPath(obj: any, path: string): any {
        if (Object.prototype.hasOwnProperty.call(obj, path)) {
            return obj[path];
        }

        const keys = path.replace(/\[(\w+)\]/g, '.$1').replace(/^\./, '').split('.');
        let copy: any = {};
        for (const attr in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, attr)) {
                copy[attr] = obj[attr];
            }
        }

        for (let i = 0, l = keys.length; i < l; i++) {
            if (Object.hasOwnProperty.call(copy, keys[i])) {
                copy = copy[keys[i]];
            } else {
                return;
            }
        }
        return copy;
    }

    /**
     * Parse raw rules object into normalized structure.
     *
     * @param rules - Raw rules mapping
     * @returns Parsed rules mapping
     */
    public _parseRules(rules: any): Record<string, any[]> {
        const parsedRules: Record<string, any[]> = {};
        rules = this._flattenObject(rules);

        for (const attribute in rules) {
            const rulesArray = rules[attribute];
            this._parseRulesCheck(attribute, rulesArray, parsedRules);
        }
        return parsedRules;
    }

    /**
     * Route parsing check for wildcard vs default rules.
     *
     * @param attribute - The attribute name
     * @param rulesArray - The rules array or string
     * @param parsedRules - The parsed rules accumulator
     * @param wildCardValues - Array of wildcard indices
     */
    public _parseRulesCheck(attribute: string, rulesArray: any, parsedRules: Record<string, any[]>, wildCardValues?: any[]): void {
        if (attribute.indexOf('*') > -1) {
            this._parsedRulesRecurse(attribute, rulesArray, parsedRules, wildCardValues);
        } else {
            this._parseRulesDefault(attribute, rulesArray, parsedRules, wildCardValues);
        }
    }

    /**
     * Recursively expand wildcard rules over input array lengths.
     *
     * @param attribute - Wildcard attribute pattern
     * @param rulesArray - Rules array
     * @param parsedRules - The parsed rules accumulator
     * @param wildCardValues - Wildcard indices array
     */
    public _parsedRulesRecurse(attribute: string, rulesArray: any, parsedRules: Record<string, any[]>, wildCardValues?: any[]): void {
        const parentPath = attribute.substr(0, attribute.indexOf('*') - 1);
        const propertyValue = this._objectPath(this.input, parentPath);

        if (propertyValue) {
            for (let propertyNumber = 0; propertyNumber < propertyValue.length; propertyNumber++) {
                const workingValues = wildCardValues ? wildCardValues.slice() : [];
                workingValues.push(propertyNumber);
                this._parseRulesCheck(attribute.replace('*', String(propertyNumber)), rulesArray, parsedRules, workingValues);
            }
        }
    }

    /**
     * Parse default (non-wildcard) rules list.
     *
     * @param attribute - Attribute name
     * @param rulesArray - Rules array or pipe-separated string
     * @param parsedRules - Target accumulator
     * @param wildCardValues - Wildcard indices array
     */
    public _parseRulesDefault(attribute: string, rulesArray: any, parsedRules: Record<string, any[]>, wildCardValues?: any[]): void {
        const attributeRules: any[] = [];

        if (rulesArray instanceof Array) {
            rulesArray = this._prepareRulesArray(rulesArray);
        }

        if (typeof rulesArray === 'string') {
            rulesArray = rulesArray.split('|');
        }

        for (let i = 0, len = rulesArray.length; i < len; i++) {
            const rule = typeof rulesArray[i] === 'string' ? this._extractRuleAndRuleValue(rulesArray[i]) : rulesArray[i];
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
    }

    /**
     * Replace wildcards in rule parameters.
     *
     * @param path - Rule parameter path or array
     * @param nums - Wildcard indices array
     * @returns Path with wildcards replaced
     */
    public _replaceWildCards(path: any, nums?: any[]): any {
        if (!nums) {
            return path;
        }

        let path2 = path;
        nums.forEach(function (value: any) {
            if (Array.isArray(path2)) {
                path2 = path2[0];
            }
            const pos = path2.indexOf('*');
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
    }

    /**
     * Replace wildcards in custom error message keys.
     *
     * @param nums - Wildcard indices array
     */
    public _replaceWildCardsMessages(nums?: any[]): void {
        const customMessages = this.messages.customMessages;
        const self = this;
        Object.keys(customMessages).forEach(function (key: string) {
            if (nums) {
                const newKey = self._replaceWildCards(key, nums);
                customMessages[newKey] = customMessages[key];
            }
        });

        this.messages._setCustom(customMessages);
    }

    /**
     * Prepare rules array by unpacking object key-value rules.
     *
     * @param rulesArray - Array of rule definitions
     * @returns Normalized rules array
     */
    public _prepareRulesArray(rulesArray: any[]): any[] {
        const rules: any[] = [];

        for (let i = 0, len = rulesArray.length; i < len; i++) {
            if (typeof rulesArray[i] === 'object') {
                for (const rule in rulesArray[i]) {
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
    }

    /**
     * Check if the input contains a value for the attribute.
     *
     * @param attribute - The attribute name
     * @returns Whether the attribute is present in input
     */
    public _suppliedWithData(attribute: string): boolean {
        return Object.prototype.hasOwnProperty.call(this.input, attribute);
    }

    /**
     * Extract rule name and optional value from a string (e.g. "min:3").
     *
     * @param ruleString - The rule string
     * @returns Object with name and optional value
     */
    public _extractRuleAndRuleValue(ruleString: string): { name: string; value?: string } {
        const rule: { name: string; value?: string } = {
            name: ruleString
        };

        if (ruleString.indexOf(':') >= 0) {
            const ruleArray = ruleString.split(':');
            rule.name = ruleArray[0];
            rule.value = ruleArray.slice(1).join(':');
        }

        return rule;
    }

    /**
     * Determine if an attribute has any of the specified rules.
     *
     * @param attribute - The attribute name
     * @param findRules - Array of rule names to search for
     * @returns Whether any matching rule was found
     */
    public _hasRule(attribute: string, findRules: string[]): boolean {
        const rules = this.rules[attribute] || [];
        for (let i = 0, len = rules.length; i < len; i++) {
            if (findRules.indexOf(rules[i].name) > -1) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if an attribute is constrained by numeric rules.
     *
     * @param attribute - The attribute name
     * @returns Whether a numeric rule is present
     */
    public _hasNumericRule(attribute: string): boolean {
        return this._hasRule(attribute, this.numericRules);
    }

    /**
     * Determine if an attribute should be validated under a rule.
     *
     * @param rule - The rule instance
     * @param value - The input value
     * @returns Whether validation should proceed
     */
    public _isValidatable(rule: any, value: any): boolean {
        if (Rules.isImplicit(rule.name)) {
            return true;
        }

        return this.getRule('required').validate(value);
    }

    /**
     * Determine whether validation should halt on first error.
     *
     * @param attribute - The attribute name
     * @param rulePassed - Whether current rule passed
     * @returns Whether validation should stop
     */
    public _shouldStopValidating(attribute: string, rulePassed: boolean): boolean {
        const stopOnAttributes = this.stopOnAttributes;
        if (typeof stopOnAttributes === 'undefined' || stopOnAttributes === false || rulePassed === true) {
            return false;
        }

        if (stopOnAttributes instanceof Array) {
            return stopOnAttributes.indexOf(attribute) > -1;
        }

        return true;
    }

    /**
     * Set custom attribute names for error messages.
     *
     * @param attributes - Map of attribute names to custom labels
     */
    public setAttributeNames(attributes: Record<string, string>): void {
        this.messages._setAttributeNames(attributes);
    }

    /**
     * Set attribute formatter function.
     *
     * @param func - Formatter function
     */
    public setAttributeFormatter(func: (attribute: string) => string): void {
        this.messages._setAttributeFormatter(func);
    }

    /**
     * Retrieve a Rule instance by name.
     *
     * @param name - The rule name
     * @returns A Rule instance
     */
    public getRule(name: string): any {
        return Rules.make(name, this);
    }

    /**
     * Configure attributes to stop validation on error.
     *
     * @param attributes - Array of attribute names, or boolean
     */
    public stopOnError(attributes: any): void {
        this.stopOnAttributes = attributes;
    }

    /**
     * Run validation and check if it passes.
     *
     * @param passes - Optional callback for async validation
     * @returns Result or Promise of passes
     */
    public passes(passes?: () => void): any {
        const async = this._checkAsync('passes', passes);
        if (async) {
            return this.checkAsync(passes);
        }
        return this.check();
    }

    /**
     * Run validation and check if it fails.
     *
     * @param fails - Optional callback for async validation
     * @returns Result or Promise of fails
     */
    public async fails(fails?: () => void): Promise<any> {
        const async = this._checkAsync('fails', fails);
        if (async) {
            return this.checkAsync(function () {}, fails);
        }
        return !(await this.check());
    }

    /**
     * Check if async callbacks are required and validate configuration.
     *
     * @param funcName - Calling method name
     * @param callback - Optional callback
     * @returns Whether async validation is enabled
     */
    public _checkAsync(funcName: string, callback?: Function): boolean {
        const hasCallback = typeof callback === 'function';
        if (this.hasAsync && !hasCallback) {
            throw funcName + ' expects a callback when async rules are being tested.';
        }

        return this.hasAsync || hasCallback;
    }

    /**
     * Set message dictionary for a language.
     *
     * @param lang - Language code
     * @param messages - Messages dictionary
     * @returns The Validator class
     */
    public static setMessages(lang: string, messages: Record<string, any>): typeof Validator {
        Lang._set(lang, messages);
        return this;
    }

    /**
     * Get messages for a language.
     *
     * @param lang - Language code
     * @returns Messages dictionary
     */
    public static getMessages(lang: string): Record<string, any> {
        return Lang._get(lang);
    }

    /**
     * Set the active language for validation messages.
     *
     * @param lang - Language code
     */
    public static useLang(lang: string): void {
        this.prototype.lang = lang;
    }

    /**
     * Get the default language code.
     *
     * @returns Default language code
     */
    public static getDefaultLang(): string {
        return this.prototype.lang;
    }

    /**
     * Set attribute formatter function globally.
     *
     * @param func - Formatter function
     */
    public static setAttributeFormatter(func: (attribute: string) => string): void {
        this.prototype.attributeFormatter = func;
    }

    /**
     * Set global stopOnError attributes.
     *
     * @param attributes - Array of attributes or boolean
     */
    public static stopOnError(attributes: any): void {
        this.prototype.stopOnAttributes = attributes;
    }

    /**
     * Register a new validation rule globally.
     *
     * @param name - Rule name
     * @param fn - Rule validator function
     * @param message - Optional error message
     */
    public static register(name: string, fn: any, message?: string): void {
        const lang = Validator.getDefaultLang();
        Rules.register(name, fn);
        Lang._setRuleMessage(lang, name, message);
    }

    /**
     * Register a new implicit validation rule globally.
     *
     * @param name - Rule name
     * @param fn - Rule validator function
     * @param message - Optional error message
     */
    public static registerImplicit(name: string, fn: any, message?: string): void {
        const lang = Validator.getDefaultLang();
        Rules.registerImplicit(name, fn);
        Lang._setRuleMessage(lang, name, message);
    }

    /**
     * Register a new asynchronous validation rule globally.
     *
     * @param name - Rule name
     * @param fn - Async rule validator function
     * @param message - Optional error message
     */
    public static registerAsync(name: string, fn: any, message?: string): void {
        const lang = Validator.getDefaultLang();
        Rules.registerAsync(name, fn);
        Lang._setRuleMessage(lang, name, message);
    }

    /**
     * Register a new asynchronous implicit validation rule globally.
     *
     * @param name - Rule name
     * @param fn - Async implicit rule validator function
     * @param message - Optional error message
     */
    public static registerAsyncImplicit(name: string, fn: any, message?: string): void {
        const lang = Validator.getDefaultLang();
        Rules.registerAsyncImplicit(name, fn);
        Lang._setRuleMessage(lang, name, message);
    }

    /**
     * Register a fallback handler for undefined rules.
     *
     * @param fn - Fallback validator function
     * @param message - Optional error message
     */
    public static registerMissedRuleValidator(fn: any, message?: string): void {
        Rules.registerMissedRuleValidator(fn, message);
    }
}

Validator.prototype.lang = 'en';
Validator.prototype.numericRules = ['integer', 'numeric'];
Validator.prototype.attributeFormatter = Attributes.formatter;

export default Validator;
