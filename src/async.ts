/**
 * Class AsyncResolvers.
 */
class AsyncResolvers {
    public onFailedOne: (rule: any, message?: string) => void;
    public onResolvedAll: (allPassed: boolean) => void;
    public resolvers: Record<number, any>;
    public resolversCount: number;
    public passed: any[];
    public failed: any[];
    public firing: boolean;

    /**
     * Create a new AsyncResolvers instance.
     *
     * @param onFailedOne - Callback when a single rule fails
     * @param onResolvedAll - Callback when all rules have been resolved
     */
    constructor(
        onFailedOne: (rule: any, message?: string) => void,
        onResolvedAll: (allPassed: boolean) => void
    ) {
        this.onResolvedAll = onResolvedAll;
        this.onFailedOne = onFailedOne;
        this.resolvers = {};
        this.resolversCount = 0;
        this.passed = [];
        this.failed = [];
        this.firing = false;
    }

    /**
     * Add a rule to be resolved.
     *
     * @param rule - The rule instance
     * @returns The index of the resolver
     */
    public add(rule: any): number {
        const index = this.resolversCount;
        this.resolvers[index] = rule;
        this.resolversCount++;
        return index;
    }

    /**
     * Resolve a rule at index.
     *
     * @param index - The resolver index
     */
    public resolve(index: number): void {
        const rule = this.resolvers[index];
        if (rule.passes === true) {
            this.passed.push(rule);
        } else if (rule.passes === false) {
            this.failed.push(rule);
            this.onFailedOne(rule);
        }

        this.fire();
    }

    /**
     * Check if all resolvers have resolved.
     *
     * @returns Whether all rules have resolved
     */
    public isAllResolved(): boolean {
        return (this.passed.length + this.failed.length) === this.resolversCount;
    }

    /**
     * Fire the final resolution callback if firing is enabled and all resolved.
     */
    public fire(): void {
        if (!this.firing) {
            return;
        }

        if (this.isAllResolved()) {
            this.onResolvedAll(this.failed.length === 0);
        }
    }

    /**
     * Enable firing upon resolution.
     */
    public enableFiring(): void {
        this.firing = true;
    }
}

export default AsyncResolvers;