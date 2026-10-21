import Attributes from './attributes';

/**
 * Class Messages.
 */
class Messages {
    public lang: string;
    public messages: Record<string, any>;
    public customMessages: Record<string, any>;
    public attributeNames: Record<string, string>;
    public attributeFormatter?: (name: string) => string;

    /**
     * Create a new Messages instance.
     *
     * @param lang - The language code
     * @param messages - The raw message dictionary
     */
    constructor(lang: string, messages: Record<string, any>) {
        this.lang = lang;
        this.messages = messages;
        this.customMessages = {};
        this.attributeNames = {};
    }

    /**
     * Set custom validation messages.
     *
     * @param customMessages - Custom message dictionary
     */
    public _setCustom(customMessages?: Record<string, any>): void {
        this.customMessages = customMessages || {};
    }

    /**
     * Set custom attribute names.
     *
     * @param attributes - Custom attribute name mapping
     */
    public _setAttributeNames(attributes: Record<string, string>): void {
        this.attributeNames = attributes;
    }

    /**
     * Set the attribute formatter function.
     *
     * @param func - Formatter function
     */
    public _setAttributeFormatter(func?: (name: string) => string): void {
        this.attributeFormatter = func;
    }

    /**
     * Get the formatted display name of an attribute.
     *
     * @param attribute - The raw attribute name
     * @returns The resolved attribute name
     */
    public _getAttributeName(attribute: string): string {
        let name: string = attribute;
        if (this.attributeNames.hasOwnProperty(attribute)) {
            return this.attributeNames[attribute];
        } else if (this.messages.attributes.hasOwnProperty(attribute)) {
            name = this.messages.attributes[attribute];
        }

        if (this.attributeFormatter) {
            name = this.attributeFormatter(name);
        }

        return name;
    }

    /**
     * Get all raw messages.
     *
     * @returns The raw messages object
     */
    public all(): Record<string, any> {
        return this.messages;
    }

    /**
     * Render the error message for a rule.
     *
     * @param rule - The validating rule instance
     * @returns The rendered error message
     */
    public render(rule: any): string {
        if (rule.customMessage) {
            return rule.customMessage;
        }
        const template = this._getTemplate(rule);
        if (Attributes.replacements[rule.name]) {
            return Attributes.replacements[rule.name].apply(this, [template, rule]);
        } else {
            return this._replacePlaceholders(rule, template, {});
        }
    }

    /**
     * Retrieve the message template for a rule.
     *
     * @param rule - The rule instance
     * @returns The message template
     */
    public _getTemplate(rule: any): any {
        const messages = this.messages;
        let template: any = messages.def;
        const customMessages = this.customMessages;
        const formats = [rule.name + '.' + rule.attribute, rule.name];
        for (let i = 0; i < formats.length; i++) {
            const format = formats[i];
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
    }

    /**
     * Replace placeholders in a message template.
     *
     * @param rule - The rule instance
     * @param template - The template string
     * @param data - The replacement data map
     * @returns The interpolated message
     */
    public _replacePlaceholders(rule: any, template: string, data: Record<string, any>): string {
        data.attribute = this._getAttributeName(rule.attribute);
        data[rule.name] = data[rule.name] || rule.getParameters().join(',');

        if (typeof template === 'string' && typeof data === 'object') {
            for (const attribute in data) {
                template = template.replace(new RegExp(':' + attribute, 'g'), data[attribute]);
            }
        }

        return template;
    }
}

export default Messages;