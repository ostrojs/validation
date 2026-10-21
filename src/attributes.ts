type ReplacementHandler = (this: any, template: string, rule: any) => string;

const replacements: Record<string, ReplacementHandler> = {
    between(this: any, template: string, rule: any): string {
        const parameters = rule.getParameters();
        return this._replacePlaceholders(rule, template, {
            min: parameters[0],
            max: parameters[1]
        });
    },

    required_if(this: any, template: string, rule: any): string {
        const parameters = rule.getParameters();
        return this._replacePlaceholders(rule, template, {
            other: this._getAttributeName(parameters[0]),
            value: parameters[1]
        });
    },

    required_unless(this: any, template: string, rule: any): string {
        const parameters = rule.getParameters();
        return this._replacePlaceholders(rule, template, {
            other: this._getAttributeName(parameters[0]),
            value: parameters[1]
        });
    },

    required_with(this: any, template: string, rule: any): string {
        const parameters = rule.getParameters();
        return this._replacePlaceholders(rule, template, {
            field: this._getAttributeName(parameters[0])
        });
    },

    required_with_all(this: any, template: string, rule: any): string {
        const parameters = rule.getParameters();
        const getAttributeName = this._getAttributeName.bind(this);
        return this._replacePlaceholders(rule, template, {
            fields: parameters.map(getAttributeName).join(', ')
        });
    },

    required_without(this: any, template: string, rule: any): string {
        const parameters = rule.getParameters();
        return this._replacePlaceholders(rule, template, {
            field: this._getAttributeName(parameters[0])
        });
    },

    required_without_all(this: any, template: string, rule: any): string {
        const parameters = rule.getParameters();
        const getAttributeName = this._getAttributeName.bind(this);
        return this._replacePlaceholders(rule, template, {
            fields: parameters.map(getAttributeName).join(', ')
        });
    },

    after(this: any, template: string, rule: any): string {
        const parameters = rule.getParameters();
        return this._replacePlaceholders(rule, template, {
            after: this._getAttributeName(parameters[0])
        });
    },

    before(this: any, template: string, rule: any): string {
        const parameters = rule.getParameters();
        return this._replacePlaceholders(rule, template, {
            before: this._getAttributeName(parameters[0])
        });
    },

    after_or_equal(this: any, template: string, rule: any): string {
        const parameters = rule.getParameters();
        return this._replacePlaceholders(rule, template, {
            after_or_equal: this._getAttributeName(parameters[0])
        });
    },

    before_or_equal(this: any, template: string, rule: any): string {
        const parameters = rule.getParameters();
        return this._replacePlaceholders(rule, template, {
            before_or_equal: this._getAttributeName(parameters[0])
        });
    },

    same(this: any, template: string, rule: any): string {
        const parameters = rule.getParameters();
        return this._replacePlaceholders(rule, template, {
            same: this._getAttributeName(parameters[0])
        });
    },

    mimes(this: any, template: string, rule: any): string {
        const parameters = rule.getParameters();
        return this._replacePlaceholders(rule, template, {
            value: parameters
        });
    },

    mimetypes(this: any, template: string, rule: any): string {
        const parameters = rule.getParameters();
        return this._replacePlaceholders(rule, template, {
            value: parameters
        });
    }
};

/**
 * Format an attribute name into a human readable string.
 *
 * @param attribute - The attribute name to format
 * @returns The formatted attribute string
 */
function formatter(attribute: string): string {
    return attribute.replace(/[_\[]/g, ' ').replace(/]/g, '');
}

export {
    replacements,
    formatter
};

export default {
    replacements,
    formatter
};