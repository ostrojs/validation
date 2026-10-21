import Validation from './validation';
import { Macroable } from '@ostro/support/macro';

const kApp: unique symbol = Symbol('app');

/**
 * Class ValidationManager.
 */
class ValidationManager extends Macroable {
    /**
     * Create a new instance.
     *
     * @param app - The application container instance
     */
    constructor(app: any) {
        super();
        Object.defineProperty(this, kApp, {
            value: app,
        });
    }

    /**
     * Create a new Validator instance.
     *
     * @param inputs - The inputs to validate
     * @param schema - The validation rules schema
     * @param messages - Custom error messages
     * @returns Promise resolving to a Validator instance
     */
    public make(inputs: any, schema: any, messages: Record<string, any> = {}): Promise<Validation> {
        return Promise.resolve(new Validation(inputs, schema, messages));
    }

    /**
     * Validate the given inputs against rules.
     *
     * @param inputs - The inputs to validate
     * @param schema - The validation rules schema
     * @param messages - Custom error messages
     * @returns Promise resolving to true or rejecting with errors
     */
    public validate(inputs: any, schema: any, messages: Record<string, any> = {}): Promise<boolean> {
        return this.make(inputs, schema, messages).then(async (validator: Validation) => {
            if (await validator.fails()) {
                return Promise.reject(validator.errors());
            } else {
                return Promise.resolve(true);
            }
        });
    }

    /**
     * Register a custom validation rule statically.
     *
     * @param name - The rule name
     * @param cb - The rule validator function
     * @param message - The default error message
     */
    public static extend(name: string, cb: any, message?: string): void {
        Validation.register(name, cb, message);
    }

    /**
     * Register an asynchronous custom validation rule statically.
     *
     * @param name - The rule name
     * @param cb - The async rule validator function
     * @param message - The default error message
     */
    public static extendAsync(name: string, cb: any, message?: string): void {
        Validation.registerAsync(name, cb, message);
    }

    /**
     * Register a custom validation rule.
     *
     * @param name - The rule name
     * @param cb - The rule validator function
     * @param message - The default error message
     */
    public extend(name: string, cb: any, message?: string): void {
        Validation.register(name, cb, message);
    }

    /**
     * Register an asynchronous custom validation rule.
     *
     * @param name - The rule name
     * @param cb - The async rule validator function
     * @param message - The default error message
     */
    public extendAsync(name: string, cb: any, message?: string): void {
        Validation.registerAsync(name, cb, message);
    }

    /**
     * Macroable static call proxy.
     *
     * @param target - The target object
     * @param method - The method name
     * @param args - The arguments array
     * @returns The method result from Validation
     */
    public static __call(target: any, method: string, args: any[]): any {
        return (Validation as any)[method](...args);
    }

    /**
     * Macroable instance call proxy.
     *
     * @param target - The target object
     * @param method - The method name
     * @param args - The arguments array
     * @returns The method result from Validation
     */
    public __call(target: any, method: string, args: any[]): any {
        return (Validation as any)[method](...args);
    }
}

export default ValidationManager;
