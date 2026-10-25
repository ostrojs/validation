import { describe, test, it, expect, afterEach, jest } from "@jest/globals";
import Validator from '../src/validation';
import File from '@ostro/contracts/container/file';
import Database from '@ostro/support/facades/database';
import Rules from '../src/rules';

describe('Validation Core & Rules', () => {
    afterEach(() => {
        Validator.useLang('en');
    });

    test('static methods (useLang, getDefaultLang, setMessages, getMessages, stopOnError, setAttributeFormatter)', () => {
        expect(Validator.getDefaultLang()).toBe('en');
        Validator.useLang('fr');
        expect(Validator.getDefaultLang()).toBe('fr');
        Validator.useLang('en');

        Validator.setMessages('test_lang', { def: 'default test message' });
        expect(Validator.getMessages('test_lang').def).toBe('default test message');

        Validator.stopOnError(true);
        Validator.setAttributeFormatter(attr => attr);

        const vEmpty = new Validator(undefined, { empty: 123 });
        expect(vEmpty.input).toEqual({});
    });

    test('basic validation passes and fails sync', async () => {
        const v1 = new Validator({ name: 'Alice', age: 25 }, {
            name: 'required|string|min:3',
            age: 'required|numeric|between:18,65'
        });
        const passes = await v1.passes();
        expect(passes).toBe(true);
        expect(await v1.fails()).toBe(false);

        const v2 = new Validator({ age: 15 }, {
            name: 'required',
            age: 'numeric|between:18,65'
        });
        const fails = await v2.fails();
        expect(fails).toBe(true);
        expect(v2.errors().first('name')).toBeDefined();
        expect(v2.errors().first('age')).toBeDefined();
    });

    test('checkAsync with callbacks', (done) => {
        const v = new Validator({ username: 'john' }, { username: 'required' });
        v.checkAsync(
            () => {
                done();
            },
            () => {
                done(new Error('Should have passed'));
            }
        );
    });

    test('checkAsync failure callback', (done) => {
        const v = new Validator({}, { username: 'required' });
        v.checkAsync(
            () => {
                done(new Error('Should have failed'));
            },
            () => {
                expect(v.errors().has('username')).toBe(true);
                done();
            }
        );
    });

    test('various built-in rules', async () => {
        const data = {
            num: 42,
            str: 'hello',
            arr: [1, 2, 3],
            obj: { key: 'val' },
            email: 'test@example.com',
            url: 'https://example.com',
            alpha: 'abc',
            alpha_dash: 'abc_123-',
            alpha_num: 'abc123',
            bool_val: true,
            bool_str: 'false',
            hex_val: 'deadbeef',
            digits_val: '1234',
            regex_val: 'test123',
            date_val: '2025-01-01',
            later_date: '2025-02-01',
            json_val: { a: 1 },
            json_str: '{"valid":true}',
            choice: 'apple',
            confirm_field: 'secret',
            confirm_field_confirmation: 'secret',
            same_1: 'same',
            same_2: 'same',
            diff_1: 'a',
            diff_2: 'b',
            present_val: 'present'
        };

        const rules = {
            num: 'numeric|integer|min:10|max:50|between:40,50',
            str: 'string|size:5',
            arr: 'array|size:3',
            obj: 'object',
            email: 'email',
            url: 'url',
            alpha: 'alpha',
            alpha_dash: 'alpha_dash',
            alpha_num: 'alpha_num',
            bool_val: 'boolean',
            bool_str: 'boolean',
            hex_val: 'hex',
            digits_val: 'digits:4',
            regex_val: 'regex:/^test[0-9]+$/',
            date_val: 'date|before:later_date|before_or_equal:later_date',
            later_date: 'date|after:date_val|after_or_equal:date_val',
            json_val: 'json',
            json_str: 'json_string',
            choice: 'in:apple,banana|not_in:orange,grape',
            confirm_field: 'confirmed',
            same_2: 'same:same_1',
            diff_2: 'different:diff_1',
            present_val: 'present'
        };

        const v = new Validator(data, rules);
        const passed = await v.passes();
        expect(passed).toBe(true);
    });

    test('file and mime validation', (done) => {
        class MockFile extends File {
            constructor(buf, ext, mime) {
                super();
                this.buffer = buf;
                this.ext = ext;
                this.mime = mime;
            }
            getBufferData() {
                return this.buffer;
            }
            getExtension() {
                return this.ext;
            }
            getMimetype() {
                return this.mime;
            }
        }

        const validFile = new MockFile(Buffer.from('test png content'), 'png', 'image/png');
        const v = new Validator({ doc: validFile }, {
            doc: 'file|mimes:png,jpg|mimetypes:image/png,image/*'
        });
        v.checkAsync(
            () => done(),
            () => done(new Error('File validation should pass'))
        );
    });

    test('database exists and not_exists rules', (done) => {
        const mockTable = {
            whereIn: jest.fn().mockReturnThis(),
            exists: jest.fn().mockResolvedValue(true)
        };
        const mockDb = {
            table: jest.fn().mockReturnValue(mockTable)
        };
        Database.swap(mockDb);

        const v = new Validator({ user_id: [5, 6] }, {
            user_id: 'exists:users,id'
        });
        v.checkAsync(
            () => {
                mockTable.exists.mockResolvedValue(false);
                const v2 = new Validator({ user_id: [5, 6] }, {
                    user_id: 'not_exists:users,id'
                });
                v2.checkAsync(
                    () => {
                        Database.clearResolvedInstances();
                        done();
                    },
                    () => done(new Error('not_exists should pass'))
                );
            },
            () => done(new Error('exists should pass'))
        );
    });

    test('custom registered rules, missed rule validator', async () => {
        Validator.register('is_even', (val) => val % 2 === 0, 'Value must be even');
        const v1 = new Validator({ num: 4 }, { num: 'is_even' });
        expect(await v1.passes()).toBe(true);

        const v2 = new Validator({ num: 5 }, { num: 'is_even' });
        expect(await v2.fails()).toBe(true);

        // Default missed rule validator throws before any override
        const v_missing = new Validator({}, {});
        const missingRule = v_missing.getRule('truly_non_existent_123');
        expect(() => missingRule.validate('val')).toThrow('Validator `truly_non_existent_123` is not defined!');

        Validator.registerMissedRuleValidator(
            function () { return false; },
            'Rule does not exist.'
        );
        const v3 = new Validator({ val: 1 }, { val: 'unknown_custom_rule' });
        expect(await v3.fails()).toBe(true);
        expect(missingRule.customMessage).toBe('Rule does not exist.');

        // Restore default missed rule validator
        Validator.registerMissedRuleValidator(function () {
            throw new Error('Validator `' + this.name + '` is not defined!');
        });
    });

    test('nested objects and wildcard * arrays in rules', async () => {
        const input = {
            users: [
                { email: 'a@example.com' },
                { email: 'b@example.com' }
            ],
            matrix: [
                ['a', 'b'],
                ['c', 'd']
            ]
        };
        const v = new Validator(input, {
            'users.*.email': 'required|email',
            'matrix.*.*': 'required|string'
        });
        expect(await v.passes()).toBe(true);
    });

    test('conditional validation (required_if, required_unless, required_with, required_without, sometimes)', async () => {
        const v1 = new Validator({ role: 'admin', token: 'secret' }, {
            token: 'required_if:role,admin'
        });
        expect(await v1.passes()).toBe(true);

        const v2 = new Validator({ role: 'guest' }, {
            token: 'required_unless:role,guest'
        });
        expect(await v2.passes()).toBe(true);

        const v3 = new Validator({ a: 1, b: 2 }, {
            b: 'required_with:a'
        });
        expect(await v3.passes()).toBe(true);

        const v4 = new Validator({ x: 10 }, {
            optional_field: 'sometimes|min:5'
        });
        expect(await v4.passes()).toBe(true);

        // required_if false condition
        const v5 = new Validator({ role: 'user' }, {
            token: 'required_if:role,admin'
        });
        expect(await v5.passes()).toBe(true);

        // required_unless when condition doesn't match => required fails
        const v6 = new Validator({ role: 'admin' }, {
            token: 'required_unless:role,guest'
        });
        expect(await v6.fails()).toBe(true);

        // required_with when key not present in input
        const v7 = new Validator({}, {
            b: 'required_with:a'
        });
        expect(await v7.passes()).toBe(true);

        // required_with when key is present but value missing
        const v7fail = new Validator({ a: 1 }, {
            b: 'required_with:a'
        });
        expect(await v7fail.fails()).toBe(true);

        // required_with_all
        const v8 = new Validator({ a: 1, b: 2, c: 3 }, {
            c: 'required_with_all:a,b'
        });
        expect(await v8.passes()).toBe(true);

        const v8_missing_one = new Validator({ a: 1 }, {
            c: 'required_with_all:a,b'
        });
        expect(await v8_missing_one.passes()).toBe(true);

        const v8_fail = new Validator({ a: 1, b: 2 }, {
            c: 'required_with_all:a,b'
        });
        expect(await v8_fail.fails()).toBe(true);

        // required_without
        const v9_pass_present = new Validator({ a: 1 }, {
            b: 'required_without:a'
        });
        expect(await v9_pass_present.passes()).toBe(true);

        const v9_pass_required = new Validator({}, {
            b: 'required_without:a'
        });
        expect(await v9_pass_required.fails()).toBe(true);

        const v9_valid = new Validator({ b: 'val' }, {
            b: 'required_without:a'
        });
        expect(await v9_valid.passes()).toBe(true);

        // required_without_all
        const v10_one_present = new Validator({ a: 1 }, {
            c: 'required_without_all:a,b'
        });
        expect(await v10_one_present.passes()).toBe(true);

        const v10_both_missing_so_required = new Validator({}, {
            c: 'required_without_all:a,b'
        });
        expect(await v10_both_missing_so_required.fails()).toBe(true);

        const v10_both_missing_but_present = new Validator({ c: 'ok' }, {
            c: 'required_without_all:a,b'
        });
        expect(await v10_both_missing_but_present.passes()).toBe(true);
    });

    test('coverage of edge cases in rules.js (dates, accepted, confirmed, digits, regex, same, different, in, not_in)', async () => {
        // accepted variations
        const acc_v = new Validator({ a1: 'on', a2: 'yes', a3: 1, a4: '1', a5: true, a6: 'no', a7: 0 }, {
            a1: 'accepted',
            a2: 'accepted',
            a3: 'accepted',
            a4: 'accepted',
            a5: 'accepted',
            a6: 'accepted',
            a7: 'accepted'
        });
        expect(await acc_v.fails()).toBe(true);
        expect(acc_v.errors().has('a1')).toBe(false);
        expect(acc_v.errors().has('a6')).toBe(true);
        expect(acc_v.errors().has('a7')).toBe(true);

        // confirmed mismatch
        const conf_v = new Validator({ password: 'abc', password_confirmation: 'def' }, {
            password: 'confirmed'
        });
        expect(await conf_v.fails()).toBe(true);

        // digits mismatch
        const dig_v = new Validator({ d1: '12', d2: 'abc' }, {
            d1: 'digits:3',
            d2: 'digits:3'
        });
        expect(await dig_v.fails()).toBe(true);

        // regex without match
        const reg_v = new Validator({ code: 'abc' }, {
            code: 'regex:/^[0-9]+$/i'
        });
        expect(await reg_v.fails()).toBe(true);

        // date invalid
        const date_v = new Validator({ d: 'invalid-date', d_empty: '' }, {
            d: 'date',
            d_empty: 'date'
        });
        expect(await date_v.fails()).toBe(true);

        // after and before comparisons edge cases (invalid dates, false comparisons)
        const date_comp = new Validator({
            d1: '2025-01-01',
            d2: '2024-01-01',
            bad1: 'invalid',
            bad2: 'invalid'
        }, {
            d2: 'after:d1|after_or_equal:d1',
            d1: 'before:d2|before_or_equal:d2',
            bad1: 'after:bad2|before:bad2|before_or_equal:bad2|after_or_equal:bad2'
        });
        expect(await date_comp.fails()).toBe(true);

        // after_or_equal and before_or_equal equal case
        const date_eq = new Validator({
            d1: '2025-01-01',
            d2: '2025-01-01'
        }, {
            d1: 'after_or_equal:d2|before_or_equal:d2'
        });
        expect(await date_eq.passes()).toBe(true);

        // same and different mismatch
        const same_diff = new Validator({
            a: 'hello',
            b: 'world',
            c: 'hello'
        }, {
            a: 'same:b',
            c: 'different:a'
        });
        expect(await same_diff.fails()).toBe(true);

        // in and not_in with array and number values
        const in_v = new Validator({
            item: 'orange',
            forbidden: 'apple',
            arr_item: ['x', 'y'],
            arr_forbidden: ['a']
        }, {
            item: 'in:apple,banana',
            forbidden: 'not_in:apple,banana',
            arr_item: 'in:x,y,z',
            arr_forbidden: 'not_in:a,b'
        });
        expect(await in_v.fails()).toBe(true);

        // numeric/size with File object and raw number
        class MockFileObj extends File {
            constructor(len) {
                super();
                this.buffer = { length: len };
            }
        }
        const file_v = new Validator({
            file_item: new MockFileObj(2048), // 2KB
            raw_num: 50
        }, {
            file_item: 'size:2',
            raw_num: 'size:50'
        });
        expect(await file_v.passes()).toBe(true);
    });

    test('database exists and not_exists false branches', (done) => {
        const mockTable = {
            whereIn: jest.fn().mockReturnThis(),
            exists: jest.fn().mockResolvedValue(false)
        };
        const mockDb = {
            table: jest.fn().mockReturnValue(mockTable)
        };
        Database.swap(mockDb);

        const v1 = new Validator({ user_id: 99 }, {
            user_id: 'exists:users,id'
        });
        v1.checkAsync(
            () => done(new Error('exists should fail when false')),
            () => {
                mockTable.exists.mockResolvedValue(true);
                const v2 = new Validator({ user_id: 99 }, {
                    user_id: 'not_exists:users,id'
                });
                v2.checkAsync(
                    () => done(new Error('not_exists should fail when true')),
                    () => {
                        Database.clearResolvedInstances();
                        done();
                    }
                );
            }
        );
    });

    test('validation stopOnError behavior and sync fails() method', async () => {
        const v = new Validator({ a: '', b: '' }, {
            a: 'required|min:5',
            b: 'required'
        });
        v.stopOnError(true);
        expect(await v.check()).toBe(false);
        expect(await v.fails()).toBe(true);

        const v2 = new Validator({ a: '', b: '' }, {
            a: 'required|min:5',
            b: 'required'
        });
        v2.stopOnError(['a']);
        expect(await v2.check()).toBe(false);
        expect(await v2.passes()).toBe(false);
    });

    test('async rules error when callback omitted in passes/fails', async () => {
        const v = new Validator({ doc: 'file' }, {
            doc: 'mimes:png'
        });
        expect(() => v.passes()).toThrow('passes expects a callback');
        let thrown = false;
        try {
            await v.fails();
        } catch (err) {
            thrown = true;
            expect(err).toContain('fails expects a callback');
        }
        expect(thrown).toBe(true);
    });

    test('Rule class missing rule execution and parameters handling', () => {
        const v = new Validator({}, {});
        const rule = Rules.make('non_existent_rule_xyz', v);
        expect(() => rule.validate('val', 'req', 'attr')).toThrow('Validator `non_existent_rule_xyz` is not defined!');

        // test getParameters with array and number
        rule.ruleValue = [1, 2];
        expect(rule.getParameters()).toEqual([1, 2]);
        rule.ruleValue = 123;
        expect(rule.getParameters()).toEqual([123]);
    });

    test('wildcard messages replacement and array rules format', async () => {
        const v = new Validator({
            items: [
                { name: 'one' },
                { name: '' }
            ]
        }, {
            'items.*.name': ['required', 'string']
        });
        expect(await v.fails()).toBe(true);
        expect(v.errors().has('items.1.name')).toBe(true);
    });

    test('_flattenObject empty and primitive cases', () => {
        const v = new Validator({}, {});
        const res = v._flattenObject({});
        expect(res).toEqual({});
        const res2 = v._flattenObject({ a: 1, b: { c: 2 }, empty: {} });
        expect(res2).toEqual({ a: 1, 'b.c': 2, empty: {} });
    });

    test('date validation rules with dots, invalid components, and all comparison branches', async () => {
        const v = new Validator({
            d_dot: '2025.05.12',
            d_bad_yr: '0500-01-01',
            d_bad_month: '2025-15-01',
            d_bad_day: '2025-02-31',
            d_bad_leap: '2023-02-29',
            d_good_leap: '2024-02-29',
            d_not_date: 'invalid',
            d1: '2025-05-10',
            d2: '2025-05-20',
            d_same: '2025-05-10'
        }, {
            d_dot: 'date',
            d_good_leap: 'date'
        });
        expect(await v.passes()).toBe(true);

        const v_invalid = new Validator({
            d_bad_yr: '0500-01-01',
            d_bad_month: '2025-15-01',
            d_bad_day: '2025-02-31',
            d_bad_leap: '2023-02-29',
            d_not_date: 'invalid'
        }, {
            d_bad_yr: 'date',
            d_bad_month: 'date',
            d_bad_day: 'date',
            d_bad_leap: 'date',
            d_not_date: 'date'
        });
        expect(await v_invalid.fails()).toBe(true);

        // Exercise all date comparison branches (after, after_or_equal, before, before_or_equal)
        // 1. Both valid, comparison succeeds
        const v_comp_pass = new Validator({
            before_date: '2025-01-01',
            after_date: '2025-01-02',
            eq_date: '2025-01-01'
        }, {
            after_date: 'after:before_date|after_or_equal:before_date|after_or_equal:eq_date',
            before_date: 'before:after_date|before_or_equal:after_date|before_or_equal:eq_date'
        });
        expect(await v_comp_pass.passes()).toBe(true);

        // 2. Both valid, comparison fails
        const v_comp_fail = new Validator({
            before_date: '2025-01-02',
            after_date: '2025-01-01'
        }, {
            after_date: 'after:before_date|after_or_equal:before_date',
            before_date: 'before:after_date|before_or_equal:after_date'
        });
        expect(await v_comp_fail.fails()).toBe(true);

        // 3. One date invalid (val1 or val2) directly tested on each comparison rule
        const v_date_direct = new Validator({
            good: '2025-01-01',
            bad: 'not-a-date'
        }, {});
        ['after', 'after_or_equal', 'before', 'before_or_equal'].forEach((ruleName) => {
            const rule = v_date_direct.getRule(ruleName);
            expect(rule.validate('2025-01-01', 'bad')).toBe(false);
            expect(rule.validate('not-a-date', 'good')).toBe(false);
        });

        // Test false return when both dates valid but condition false
        const v_date_false = new Validator({
            d1: '2025-01-02',
            d2: '2025-01-01'
        }, {});
        expect(v_date_false.getRule('after_or_equal').validate('2025-01-01', 'd1')).toBe(false);
        expect(v_date_false.getRule('before_or_equal').validate('2025-01-02', 'd2')).toBe(false);

        // 4. Test remaining branches of isValidDate using mock
        const OrigDate = Date;
        let mockMonth = null;
        let mockDay = null;
        global.Date = class extends OrigDate {
            getMonth() {
                return mockMonth !== null ? mockMonth : super.getMonth();
            }
            getDate() {
                return mockDay !== null ? mockDay : super.getDate();
            }
        };
        try {
            const dateRule = v_date_direct.getRule('date');
            mockMonth = 15;
            expect(dateRule.validate('2025-01-01')).toBe(false);
            mockMonth = null;
            mockDay = NaN;
            expect(dateRule.validate('2025-01-01')).toBe(false);
            mockDay = 35;
            expect(dateRule.validate('2025-01-01')).toBe(false);
        } finally {
            global.Date = OrigDate;
        }
    });

    test('rules registration methods and implicit / async implicit rules', () => {
        Validator.registerAsync('async_custom', async (val) => true);
        Validator.registerImplicit('implicit_custom', (val) => true);
        Validator.registerAsyncImplicit('async_implicit_custom', async (val) => true);

        const v = new Validator({ a: 'test' }, {
            a: 'implicit_custom'
        });
        expect(v._hasRule('a', ['implicit_custom'])).toBe(true);

        // setAttributeNames
        v.setAttributeNames({ a: 'Field A' });
        expect(v.messages.attributeNames.a).toBe('Field A');
    });

    test('rules array with object format and wildcards in messages', async () => {
        const v = new Validator({
            users: [{ name: 'A' }, { name: 'B' }]
        }, {
            'users.*.name': [{ min: '1' }, 'string']
        }, {
            'min.users.*.name': 'The user name at :attribute must be at least :min'
        });
        expect(await v.passes()).toBe(true);
    });

    test('size rule with numeric rule present and _getValueType', async () => {
        const v = new Validator({
            code: '12345'
        }, {
            code: 'numeric|size:12345'
        });
        expect(await v.passes()).toBe(true);

        // Rule _getValueType string
        const rule = v.getRule('size');
        rule._setValidatingData('text', 'hello', '5');
        expect(rule._getValueType()).toBe('string');
    });

    test('mimes and mimetypes wildcard and error handling', async () => {
        const v = new Validator({}, {});
        const mimesRule = Rules.make('mimes', v);
        // val without buffer / causing exception in fileDetails
        const res = await mimesRule.validate(null, 'png');
        expect(res).toBe(false);

        // json_string with invalid json string
        const jsonRule = Rules.make('json_string', v);
        expect(jsonRule.validate('{bad json')).toBe(false);

        // _replaceWildCards with Array path and non-wildcard path
        const arrPath = ['users.*.name'];
        const replaced = v._replaceWildCards(arrPath, [2]);
        expect(replaced[0]).toBe('users.2.name');
        expect(v._replaceWildCards('users.name', [1])).toBe('users.name');
    });

    test('passes and fails with async callbacks directly', (done) => {
        const v = new Validator({
            doc: { buffer: Buffer.from('abc') }
        }, {
            doc: 'mimes:png'
        });
        v.fails(() => {
            class MockValidFile {
                constructor() { this.buffer = Buffer.from('test'); }
                getBufferData() { return this.buffer; }
                getExtension() { return 'png'; }
                getMimetype() { return 'image/png'; }
            }
            const vPassing = new Validator({
                doc: new MockValidFile()
            }, {
                doc: 'mimes:png'
            });
            // When vPassing passes, fails() triggers the internal passes callback: function () { }
            vPassing.fails(() => {
                done(new Error('Should not call fails on passing validator'));
            });
            vPassing.passes(() => {
                // passes callback called on passing async validator
            });
            setTimeout(() => {
                done();
            }, 50);
        });
    });

    test('Validator static register helpers for other languages', () => {
        Validator.setMessages('es', { required: 'El campo :attribute es requerido.' });
        Validator.setAttributeFormatter((attr) => attr.toUpperCase(), 'es');
        expect(Validator.getMessages('es').required).toBe('El campo :attribute es requerido.');
    });

    test('coverage for remaining edge branches (dates, sometimes in async, size, in array)', (done) => {
        // 1. in rule with array value
        const v_in_arr = new Validator({
            roles: ['admin', 'superadmin'],
            bad_roles: ['admin', 'hacker']
        }, {
            roles: 'in:admin,superadmin,guest',
            bad_roles: 'in:admin,superadmin,guest'
        });
        expect(v_in_arr.getRule('in').validate(['admin', 'superadmin'], 'admin,superadmin,guest')).toBe(true);
        expect(v_in_arr.getRule('in').validate(['admin', 'hacker'], 'admin,superadmin,guest')).toBe(false);

        // 2. sometimes rule directly
        const v_some = new Validator({}, {});
        expect(v_some.getRule('sometimes').validate('val')).toBe(true);
        expect(v_some.getRule('size').validate(null, 5)).toBe(true);

        // 3. checkAsync with sometimes rule on missing field and non-validatable rule
        const v_async_some = new Validator({}, {
            opt: 'sometimes|mimes:png',
            empty_field: 'string|mimes:png' // empty field with non-implicit rule is skipped
        });
        v_async_some.checkAsync(
            () => done(),
            () => done(new Error('Should pass when field missing under sometimes'))
        );
    });

    test('mimetypes wildcard prefix match and prefix mismatch', async () => {
        const v = new Validator({}, {});
        const rule = Rules.make('mimetypes', v);

        class MockFileWithMime {
            constructor(mime) { this.mime = mime; }
            getBufferData() { return Buffer.from('test'); }
            getMimetype() { return this.mime; }
        }

        const matchFile = new MockFileWithMime('image/png');
        const mismatchFile = new MockFileWithMime('application/pdf');

        const passesMatch = await rule.validate(matchFile, 'image/*');
        expect(passesMatch).toBe(true);

        const failsMismatch = await rule.validate(mismatchFile, 'image/*');
        expect(failsMismatch).toBe(false);

        // Test non-wildcard mismatch
        const failsNonWildcard = await rule.validate(mismatchFile, 'image/jpeg');
        expect(failsNonWildcard).toBe(false);

        // Test exception thrown in fileDetails (val is null)
        const failsCatch = await rule.validate(null, 'image/*');
        expect(failsCatch).toBe(false);
    });

    test('async rule returning non-thenable object in validate callback', (done) => {
        const v = new Validator({}, {});
        Rules.registerAsync('sync_returns_val', function (val, req, attr, cb) {
            cb(true);
            return 'not_a_promise';
        });
        const rule = Rules.make('sync_returns_val', v);
        let passesReceived = false;
        const res = rule.validate('test', null, 'attr', (passes) => {
            passesReceived = passes;
        });
        expect(passesReceived).toBe(true);
        expect(res).toBe('not_a_promise');

        // Test async rule returning rejected Promise to trigger handleResponse(false)
        Rules.registerAsync('async_rejects', function () {
            return Promise.reject(new Error('Async error'));
        });
        const rejectRule = Rules.make('async_rejects', v);
        rejectRule.validate('test', null, 'attr', (passes) => {
            expect(passes).toBe(false);
            done();
        });
    });

    test('checkAsync default callbacks executed when passes and fails are omitted', (done) => {
        const vPassing = new Validator({ a: 'foo' }, { a: 'required' });
        // checkAsync with no arguments - default passes() is executed
        vPassing.checkAsync();

        const vFailing = new Validator({ a: '' }, { a: 'required' });
        // checkAsync with no arguments - default fails() is executed
        vFailing.checkAsync();

        setTimeout(() => {
            done();
        }, 50);
    });

    test('check loop with stopOnError breaking loop', async () => {
        const v = new Validator({ a: '' }, { a: 'required|min:5' });
        v.stopOnError(true);
        const passed = await v.passes();
        expect(passed).toBe(false);
        // Only 1 error for 'a' because it stopped after required failed
        expect(v.errors().get('a').length).toBe(1);

        const vNoStop = new Validator({ a: '' }, { a: 'required|email' });
        v.stopOnError(false);
        const passed2 = await vNoStop.passes();
        expect(passed2).toBe(false);

        const vArrayAttr = new Validator({ a: '' }, { a: 'required|min:5' });
        vArrayAttr.stopOnError(['other']);
        const passed3 = await vArrayAttr.passes();
        expect(passed3).toBe(false);
    });

});

