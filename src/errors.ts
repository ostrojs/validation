/**
 * Class Errors.
 */
class Errors {
    public errors: Record<string, string[]>;

    /**
     * Create a new instance.
     */
    constructor() {
        this.errors = {};
    }

    /**
     * Add an error message for an attribute.
     *
     * @param attribute - The attribute name
     * @param message - The error message
     */
    public add(attribute: string, message: string): void {
        if (!this.has(attribute)) {
            this.errors[attribute] = [];
        }

        if (this.errors[attribute].indexOf(message) === -1) {
            this.errors[attribute].push(message);
        }
    }

    /**
     * Get error messages for an attribute.
     *
     * @param attribute - The attribute name
     * @returns Array of error messages
     */
    public get(attribute: string): string[] {
        if (this.has(attribute)) {
            return this.errors[attribute];
        }

        return [];
    }

    /**
     * Get the first error message for an attribute.
     *
     * @param attribute - The attribute name
     * @returns The first error message or false if none
     */
    public first(attribute: string): string | false {
        if (this.has(attribute)) {
            return this.errors[attribute][0];
        }

        return false;
    }

    /**
     * Get all error messages.
     *
     * @returns Record of attribute error arrays
     */
    public all(): Record<string, string[]> {
        return this.errors;
    }

    /**
     * Check if an attribute has errors.
     *
     * @param attribute - The attribute name
     * @returns Whether the attribute has errors
     */
    public has(attribute: string): boolean {
        return Object.prototype.hasOwnProperty.call(this.errors, attribute);
    }
}

export default Errors;