import ValidationException from '../src/validationException';
import Errors from '../src/errors';
import AsyncResolvers from '../src/async';
import ValidationServiceProvider from '../src/validationServiceProvider';
import ValidationManager from '../src/validationManager';

describe('Validation Helpers & Supporting Classes', () => {
    describe('ValidationException', () => {
        test('constructor and defaults', () => {
            const err = new ValidationException();
            expect(err.name).toBe('ValidationException');
            expect(err.status).toBe(422);
            expect(err.getMessage()).toBe('Given data was invalid');
            expect(err.all()).toEqual({});
            expect(err.getErrors()).toEqual({});
        });

        test('add, get, first, has', () => {
            const err = new ValidationException();
            expect(err.has('email')).toBe(false);
            expect(err.get('email')).toEqual([]);
            expect(err.first('email')).toBe(false);

            err.add('email', 'Email is required');
            expect(err.has('email')).toBe(true);
            expect(err.get('email')).toEqual(['Email is required']);
            expect(err.first('email')).toBe('Email is required');

            // duplicate message ignored
            err.add('email', 'Email is required');
            expect(err.get('email')).toHaveLength(1);

            err.add('email', 'Email is invalid');
            expect(err.get('email')).toHaveLength(2);
            expect(err.first('email')).toBe('Email is required');
        });
    });

    describe('Errors', () => {
        test('constructor, add, get, first, all, has', () => {
            const errors = new Errors();
            expect(errors.has('name')).toBe(false);
            expect(errors.get('name')).toEqual([]);
            expect(errors.first('name')).toBe(false);
            expect(errors.all()).toEqual({});

            errors.add('name', 'Name is required');
            expect(errors.has('name')).toBe(true);
            expect(errors.first('name')).toBe('Name is required');
            expect(errors.get('name')).toEqual(['Name is required']);

            // duplicate message ignored
            errors.add('name', 'Name is required');
            expect(errors.get('name')).toHaveLength(1);

            errors.add('name', 'Name must be string');
            expect(errors.get('name')).toHaveLength(2);
        });
    });

    describe('AsyncResolvers', () => {
        test('tracks passed and failed rules, calls callbacks', () => {
            const onFailedOne = jest.fn();
            const onResolvedAll = jest.fn();
            const resolvers = new AsyncResolvers(onFailedOne, onResolvedAll);

            const rule1 = { passes: true };
            const rule2 = { passes: false };

            const id1 = resolvers.add(rule1);
            const id2 = resolvers.add(rule2);

            expect(resolvers.isAllResolved()).toBe(false);

            resolvers.resolve(id1);
            expect(onResolvedAll).not.toHaveBeenCalled();

            resolvers.enableFiring();
            resolvers.resolve(id2);

            expect(onFailedOne).toHaveBeenCalledWith(rule2);
            expect(resolvers.isAllResolved()).toBe(true);
            expect(onResolvedAll).toHaveBeenCalledWith(false); // since one failed
        });
    });

    describe('ValidationServiceProvider', () => {
        test('register sets singleton and boot is callable', () => {
            const registered = {};
            const mockApp = {
                singleton: (key, factory) => {
                    registered[key] = factory(mockApp);
                }
            };
            const provider = new ValidationServiceProvider(mockApp);
            provider.register();
            expect(registered.validation).toBeInstanceOf(ValidationManager);
            expect(provider.boot()).toBeUndefined();
        });
    });

    describe('ValidationManager', () => {
        test('make and validate success', async () => {
            const manager = new ValidationManager({});
            const validation = await manager.make({ age: 25 }, { age: 'required|numeric' });
            expect(validation).toBeDefined();

            const valid = await manager.validate({ age: 25 }, { age: 'required|numeric' });
            expect(valid).toBe(true);
        });

        test('validate failure rejects with errors', async () => {
            const manager = new ValidationManager({});
            await expect(manager.validate({}, { name: 'required' })).rejects.toBeDefined();
        });

        test('extend and extendAsync on instance and static', () => {
            const manager = new ValidationManager({});
            ValidationManager.extend('custom_static', () => true, 'custom message');
            ValidationManager.extendAsync('custom_static_async', (val, req, attr, done) => done(true), 'msg');

            manager.extend('custom_inst', () => true, 'custom message');
            manager.extendAsync('custom_inst_async', (val, req, attr, done) => done(true), 'msg');
        });

        test('__call dynamic method proxy', () => {
            const manager = new ValidationManager({});
            expect(ValidationManager.__call(ValidationManager, 'getDefaultLang', [])).toBe('en');
            expect(manager.__call(manager, 'getDefaultLang', [])).toBe('en');
        });
    });
});
