import Lang from '../src/lang';
import Messages from '../src/messages';
import Attributes from '../src/attributes';

describe('Lang, Messages & Attributes', () => {
    describe('Lang', () => {
        test('_get, _set, _setRuleMessage, _load, _make', () => {
            const en = Lang._get('en');
            expect(en).toBeDefined();
            expect(en.required).toBeDefined();

            Lang._setRuleMessage('en', 'custom_rule', 'The :attribute is custom.');
            expect(Lang._get('en').custom_rule).toBe('The :attribute is custom.');

            Lang._setRuleMessage('en', 'custom_def_rule');
            expect(Lang._get('en').custom_def_rule).toBe(Lang._get('en').def);

            Lang._set('custom_lang', { required: 'requis', def: 'invalide' });
            expect(Lang._get('custom_lang').required).toBe('requis');

            // non-existent lang loads safely with catch
            Lang._load('non_existent_lang_xyz');

            const allLocales = [
                'ar', 'az', 'be', 'bg', 'bs', 'ca', 'cs', 'cy', 'da', 'de',
                'el', 'en', 'es', 'et', 'eu', 'fa', 'fi', 'fr', 'hr', 'hu',
                'id', 'it', 'ja', 'ka', 'ko', 'lt', 'lv', 'mk', 'mn', 'ms',
                'nb_NO', 'nl', 'pl', 'pt', 'pt_BR', 'ro', 'ru', 'sl', 'sq', 'sr',
                'sv', 'tr', 'ua', 'uk', 'vi', 'zh', 'zh_TW'
            ];
            for (const loc of allLocales) {
                const loaded = Lang._get(loc);
                expect(loaded).toBeDefined();
                expect(loaded.required).toBeDefined();
            }

            const msgInstance = Lang._make('en');
            expect(msgInstance).toBeInstanceOf(Messages);
        });
    });

    describe('Messages', () => {
        test('customMessages, attributeNames, attributeFormatter, render', () => {
            const rawMessages = {
                required: 'The :attribute field is required.',
                min: {
                    numeric: 'The :attribute must be at least :min.',
                    string: 'The :attribute must be at least :min characters.'
                },
                between: {
                    numeric: 'The :attribute must be between :min and :max.',
                    string: 'The :attribute must be between :min and :max characters.'
                },
                def: 'The :attribute is invalid.',
                attributes: {
                    user_email: 'email address'
                }
            };
            const messages = new Messages('en', rawMessages);
            expect(messages.all()).toBe(rawMessages);

            messages._setAttributeNames({ first_name: 'First Name' });
            expect(messages._getAttributeName('first_name')).toBe('First Name');
            expect(messages._getAttributeName('user_email')).toBe('email address');
            expect(messages._getAttributeName('unknown_attr')).toBe('unknown_attr');

            messages._setAttributeFormatter(attr => attr.toUpperCase());
            expect(messages._getAttributeName('user_email')).toBe('EMAIL ADDRESS');

            messages._setCustom({
                'required.first_name': 'Please enter your first name.'
            });

            // render with rule.customMessage
            expect(messages.render({ customMessage: 'Explicit override' })).toBe('Explicit override');

            // render with custom message match
            const customRule = {
                name: 'required',
                attribute: 'first_name',
                getParameters: () => []
            };
            expect(messages.render(customRule)).toBe('Please enter your first name.');

            // render standard placeholder
            const reqRule = {
                name: 'required',
                attribute: 'last_name',
                getParameters: () => []
            };
            expect(messages.render(reqRule)).toBe('The LAST_NAME field is required.');
        });
    });

    describe('Attributes replacements', () => {
        const messages = new Messages('en', { def: 'invalid', attributes: {} });

        test('between replacement', () => {
            const rule = {
                name: 'between',
                attribute: 'num',
                getParameters: () => [10, 20],
                _getValueType: () => 'numeric'
            };
            const rendered = Attributes.replacements.between.call(messages, 'Between :min and :max', rule);
            expect(rendered).toBe('Between 10 and 20');
        });

        test('required_if & required_unless replacement', () => {
            const rule = {
                name: 'required_if',
                attribute: 'state',
                getParameters: () => ['country', 'US']
            };
            expect(Attributes.replacements.required_if.call(messages, ':other is :value', rule)).toBe('country is US');
            expect(Attributes.replacements.required_unless.call(messages, ':other is :value', rule)).toBe('country is US');
        });

        test('required_with & required_with_all & required_without & required_without_all', () => {
            const ruleSingle = {
                name: 'required_with',
                attribute: 'last',
                getParameters: () => ['first']
            };
            expect(Attributes.replacements.required_with.call(messages, 'with :field', ruleSingle)).toBe('with first');
            expect(Attributes.replacements.required_without.call(messages, 'without :field', ruleSingle)).toBe('without first');

            const ruleMulti = {
                name: 'required_with_all',
                attribute: 'last',
                getParameters: () => ['first', 'middle']
            };
            expect(Attributes.replacements.required_with_all.call(messages, 'with :fields', ruleMulti)).toBe('with first, middle');
            expect(Attributes.replacements.required_without_all.call(messages, 'without :fields', ruleMulti)).toBe('without first, middle');
        });

        test('after, after_or_equal, before, before_or_equal, same, mimes, mimetypes', () => {
            const makeRule = (name, other) => ({
                name,
                attribute: 'end_date',
                getParameters: () => [other]
            });
            expect(Attributes.replacements.after.call(messages, 'after :after', makeRule('after', 'start_date'))).toBe('after start_date');
            expect(Attributes.replacements.after_or_equal.call(messages, 'after_or_equal :after_or_equal', makeRule('after_or_equal', 'start_date'))).toBe('after_or_equal start_date');
            expect(Attributes.replacements.before.call(messages, 'before :before', makeRule('before', 'start_date'))).toBe('before start_date');
            expect(Attributes.replacements.before_or_equal.call(messages, 'before_or_equal :before_or_equal', makeRule('before_or_equal', 'start_date'))).toBe('before_or_equal start_date');
            expect(Attributes.replacements.same.call(messages, 'same as :same', makeRule('same', 'pass'))).toBe('same as pass');

            const mimesRule = {
                name: 'mimes',
                attribute: 'avatar',
                getParameters: () => ['png', 'jpg']
            };
            expect(Attributes.replacements.mimes.call(messages, 'files: :value', mimesRule)).toBe('files: png,jpg');
            expect(Attributes.replacements.mimetypes.call(messages, 'types: :value', mimesRule)).toBe('types: png,jpg');
            expect(Attributes.formatter('user_name[0]')).toBe('user name 0');
        });
    });
});
