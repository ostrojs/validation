import Messages from './messages';
import './lang/en';

const requireMethod: NodeRequire = require;

interface LangContainer {
    messages: Record<string, any>;
    _set(lang: string, rawMessages: Record<string, any>): void;
    _setRuleMessage(lang: string, attribute: string, message?: string): void;
    _load(lang: string): void;
    _get(lang: string): Record<string, any>;
    _make(lang: string): Messages;
}

const container: LangContainer = {
    messages: {},

    /**
     * Store raw messages for a language.
     *
     * @param lang - The language code
     * @param rawMessages - The raw message dictionary
     */
    _set(lang: string, rawMessages: Record<string, any>): void {
        this.messages[lang] = rawMessages;
    },

    /**
     * Set a custom message for a rule in a language.
     *
     * @param lang - The language code
     * @param attribute - The rule/attribute identifier
     * @param message - The message string or fallback to default
     */
    _setRuleMessage(lang: string, attribute: string, message?: string): void {
        this._load(lang);
        if (message === undefined) {
            message = this.messages[lang].def;
        }

        this.messages[lang][attribute] = message;
    },

    /**
     * Load language messages dynamically if not already loaded.
     *
     * @param lang - The language code
     */
    _load(lang: string): void {
        if (!this.messages[lang]) {
            try {
                const rawModule = requireMethod('./lang/' + lang);
                const rawMessages = rawModule?.default || rawModule;
                this._set(lang, rawMessages);
            } catch (e) {}
        }
    },

    /**
     * Get the raw message dictionary for a language.
     *
     * @param lang - The language code
     * @returns The raw messages object
     */
    _get(lang: string): Record<string, any> {
        this._load(lang);
        return this.messages[lang];
    },

    /**
     * Create a new Messages instance for a language.
     *
     * @param lang - The language code
     * @returns A new Messages instance
     */
    _make(lang: string): Messages {
        this._load(lang);
        return new Messages(lang, this.messages[lang]);
    }
};

export default container;