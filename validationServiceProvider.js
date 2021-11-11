const ServiceProvider = require('@ostro/support/serviceProvider');
const Validation = require('./validationManager');
class validationServiceProvider extends ServiceProvider {
    register() {
        this.$app.singleton('validation', function(app) {
            return new Validation(app)
        })
    }
    boot() {}

}
module.exports = validationServiceProvider