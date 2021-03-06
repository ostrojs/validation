function AsyncResolvers(onFailedOne, onResolvedAll) {
    this.onResolvedAll = onResolvedAll;
    this.onFailedOne = onFailedOne;
    this.resolvers = {};
    this.resolversCount = 0;
    this.passed = [];
    this.failed = [];
    this.firing = false;
}

AsyncResolvers.prototype = {

    add: function(rule) {
        var index = this.resolversCount;
        this.resolvers[index] = rule;
        this.resolversCount++;
        return index;
    },

    resolve: function(index) {
        var rule = this.resolvers[index];
        if (rule.passes === true) {
            this.passed.push(rule);
        } else if (rule.passes === false) {
            this.failed.push(rule);
            this.onFailedOne(rule);
        }

        this.fire();
    },

    isAllResolved: function() {
        return (this.passed.length + this.failed.length) === this.resolversCount;
    },

    fire: function() {

        if (!this.firing) {
            return;
        }

        if (this.isAllResolved()) {
            this.onResolvedAll(this.failed.length === 0);
        }

    },

    enableFiring: function() {
        this.firing = true;
    }

};

module.exports = AsyncResolvers;