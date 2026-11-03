'use strict';

/*
 * Локальная «авторизация» без сервера: аккаунты и предпочтения лежат в localStorage браузера.
 * Это учебная защита (пароль хранится в виде хеша с «солью»). Для настоящего сайта
 * регистрацию и пароли нужно делать на сервере.
 */
const Auth = (() => {
    const USERS_KEY = 'recipehub:users';
    const SESSION_KEY = 'recipehub:session';
    const GUEST_PREFS_KEY = 'recipehub:guestPrefs';
    const DEFAULT_PREFS = { diet: 'any', allergens: [], dislikes: [], dailyKcal: 2000, people: 2 };

    function read(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw === null ? fallback : JSON.parse(raw);
        } catch (e) { return fallback; }
    }

    function write(key, value) {
        try {
            if (value === null) localStorage.removeItem(key);
            else localStorage.setItem(key, JSON.stringify(value));
        } catch (e) { /* хранилище недоступно */ }
    }

    function cyrb53(str, seed = 0) {
        let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
        for (let i = 0, ch; i < str.length; i++) {
            ch = str.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        return 4294967296 * (2097151 & h2) + (h1 >>> 0);
    }

    function hashPassword(password, salt) {
        return cyrb53(salt + password, 1).toString(16) + cyrb53(password + salt, 2).toString(16);
    }

    function newSalt() {
        return Math.random().toString(36).slice(2) + Date.now().toString(36);
    }

    function clamp(n, min, max, fallback) {
        n = Number(n);
        if (!Number.isFinite(n)) return fallback;
        return Math.min(max, Math.max(min, Math.round(n)));
    }

    function normalizePrefs(raw) {
        const p = Object.assign({}, DEFAULT_PREFS, raw || {});
        p.diet = ['any', 'vegetarian', 'vegan'].includes(p.diet) ? p.diet : 'any';
        p.allergens = Array.isArray(p.allergens) ? [...new Set(p.allergens)] : [];
        p.dislikes = Array.isArray(p.dislikes) ? [...new Set(p.dislikes)] : [];
        p.dailyKcal = clamp(p.dailyKcal, 800, 6000, 2000);
        p.people = clamp(p.people, 1, 20, 2);
        return p;
    }

    const users = () => read(USERS_KEY, {});
    const normEmail = email => String(email || '').trim().toLowerCase();

    function current() {
        const email = read(SESSION_KEY, null);
        if (!email) return null;
        const u = users()[email];
        return u ? { email: u.email, name: u.name } : null;
    }

    /** Идентификатор для ключей localStorage: e-mail или 'guest' */
    function storageId() {
        const c = current();
        return c ? c.email : 'guest';
    }

    function getPrefs() {
        const c = current();
        if (c) return normalizePrefs(users()[c.email].prefs);
        return normalizePrefs(read(GUEST_PREFS_KEY, null));
    }

    function savePrefs(prefs) {
        const n = normalizePrefs(prefs);
        const c = current();
        if (c) {
            const all = users();
            all[c.email].prefs = n;
            write(USERS_KEY, all);
        } else {
            write(GUEST_PREFS_KEY, n);
        }
        return n;
    }

    function register({ name, email, password, prefs }) {
        name = String(name || '').trim();
        email = normEmail(email);
        password = String(password || '');
        if (!name) return { ok: false, error: 'Введите имя' };
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Введите корректный e-mail' };
        if (password.length < 6) return { ok: false, error: 'Пароль должен быть не короче 6 символов' };
        const all = users();
        if (all[email]) return { ok: false, error: 'Аккаунт с таким e-mail уже есть — войдите' };
        const salt = newSalt();
        all[email] = {
            email, name, salt,
            hash: hashPassword(password, salt),
            prefs: normalizePrefs(prefs),
            createdAt: Date.now()
        };
        write(USERS_KEY, all);
        write(SESSION_KEY, email);
        return { ok: true };
    }

    function login({ email, password }) {
        email = normEmail(email);
        const u = users()[email];
        if (!u || u.hash !== hashPassword(String(password || ''), u.salt)) {
            return { ok: false, error: 'Неверный e-mail или пароль' };
        }
        write(SESSION_KEY, email);
        return { ok: true };
    }

    function logout() { write(SESSION_KEY, null); }

    return { current, storageId, getPrefs, savePrefs, register, login, logout, normalizePrefs };
})();
