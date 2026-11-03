(() => {
    'use strict';

    /* =====================================================
     *  Константы
     * ===================================================== */
    const CATEGORIES = [
        { id: 'all', label: 'Все' },
        { id: 'breakfast', label: '🥞 Завтраки' },
        { id: 'dessert', label: '🍰 Десерты' },
        { id: 'vegan', label: '🌱 Веганское' },
        { id: 'main', label: '🍲 Основные блюда' }
    ];
    const CATEGORY_LABEL = { breakfast: 'Завтрак', dessert: 'Десерт', vegan: 'Веган', main: 'Основное' };
    const DIET_LABEL = { any: 'Без ограничений', vegetarian: 'Вегетарианское', vegan: 'Веганское' };
    const MIN_SERVINGS = 1;
    const MAX_SERVINGS = 60;
    const MAX_PEOPLE = 20;
    const MEAL_BY_ID = Object.fromEntries(MEALS.map(m => [m.id, m]));

    /* =====================================================
     *  Хранилище и состояние
     * ===================================================== */
    const store = {
        get(key, fallback) {
            try {
                const raw = localStorage.getItem(key);
                return raw === null ? fallback : JSON.parse(raw);
            } catch (e) { return fallback; }
        },
        set(key, value) {
            try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
        }
    };

    const favKey = () => {
        const id = Auth.storageId();
        return id === 'guest' ? 'recipehub:favorites' : 'recipehub:favorites:' + id;
    };
    const fridgeKey = () => 'recipehub:fridge:' + Auth.storageId();

    const state = {
        view: 'catalog',
        // каталог
        query: '', category: 'all', maxTime: 0, maxCal: 0, sort: 'default', favOnly: false,
        // профиль
        applyProfile: true,
        prefs: Auth.getPrefs(),
        people: 2,
        favorites: new Set(),
        // холодильник
        fridge: new Set(), fridgeMeal: 'breakfast', fridgeMode: 'miss2', productQuery: '',
        // открытый рецепт
        current: null, servings: 1, servingsManual: false, ctxMeal: 'lunch', fromFridge: false,
        cook: { step: 0, voice: false }
    };

    const clampPeople = n => Math.min(MAX_PEOPLE, Math.max(1, Math.round(Number(n)) || 1));

    function loadUserData() {
        state.prefs = Auth.getPrefs();
        state.people = clampPeople(state.prefs.people);
        state.favorites = new Set(store.get(favKey(), []));
        state.fridge = new Set(store.get(fridgeKey(), []));
    }

    const timer = { total: 0, remaining: 0, endAt: 0, id: null, running: false };
    let wakeLock = null;
    let audioCtx = null;
    let toastTimeout = null;

    /* =====================================================
     *  DOM
     * ===================================================== */
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

    const el = {
        search: $('#search'), favToggle: $('#favToggle'), favCount: $('#favCount'), authBtn: $('#authBtn'),
        tabs: $$('.tab'),
        peopleNumber: $('#peopleNumber'), peopleMinus: $('#peopleMinus'), peoplePlus: $('#peoplePlus'), goalInfo: $('#goalInfo'),
        profileNote: $('#profileNote'),
        viewCatalog: $('#viewCatalog'), viewFridge: $('#viewFridge'),
        chips: $('#categoryChips'), timeFilter: $('#timeFilter'), calFilter: $('#calFilter'),
        sortSelect: $('#sortSelect'), resetFilters: $('#resetFilters'),
        resultsInfo: $('#resultsInfo'), grid: $('#grid'),
        productSearch: $('#productSearch'), fridgeClear: $('#fridgeClear'), fridgeCount: $('#fridgeCount'),
        productGroups: $('#productGroups'), mealChips: $('#mealChips'), fridgeMode: $('#fridgeMode'),
        fridgeInfo: $('#fridgeInfo'), fridgeGrid: $('#fridgeGrid'),
        modal: $('#recipeModal'), modalBody: $('#modalBody'),
        dialog: $('#dialog'), dialogBody: $('#dialogBody'),
        cook: $('#cookMode'), cookTitle: $('#cookTitle'), cookCounter: $('#cookCounter'),
        cookProgress: $('#cookProgress'), cookStepText: $('#cookStepText'),
        cookServings: $('#cookServings'), cookIngredients: $('#cookIngredients'),
        cookPrev: $('#cookPrev'), cookNext: $('#cookNext'), cookRepeat: $('#cookRepeat'), cookExit: $('#cookExit'),
        voiceToggle: $('#voiceToggle'),
        timerPanel: $('#timerPanel'), timerDisplay: $('#timerDisplay'), timerBar: $('#timerBar'),
        timerStart: $('#timerStart'), timerReset: $('#timerReset'), timerPlus: $('#timerPlus'),
        toast: $('#toast')
    };

    /* =====================================================
     *  Утилиты
     * ===================================================== */
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    function plural(n, one, few, many) {
        const m10 = n % 10, m100 = n % 100;
        if (m10 === 1 && m100 !== 11) return one;
        if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
        return many;
    }
    const servingsText = n => `${n} ${plural(n, 'порция', 'порции', 'порций')}`;
    const peopleText = n => `${n} ${plural(n, 'человек', 'человека', 'человек')}`;

    function fractionText(v) {
        const whole = Math.floor(v);
        const frac = Math.round((v - whole) * 100) / 100;
        const map = { 0.25: '¼', 0.5: '½', 0.75: '¾' };
        if (frac === 0) return String(whole);
        if (map[frac]) return (whole ? whole + ' ' : '') + map[frac];
        return String(Math.round(v * 100) / 100).replace('.', ',');
    }

    function formatAmount(amount, unit) {
        if (amount === null || amount === undefined) return 'по вкусу';
        let a = amount, u = unit;
        if (u === 'г' && a >= 1000) { a /= 1000; u = 'кг'; }
        else if (u === 'мл' && a >= 1000) { a /= 1000; u = 'л'; }

        let text;
        if (u === 'г' || u === 'мл') {
            text = String(a >= 100 ? Math.round(a / 5) * 5 : Math.max(1, Math.round(a)));
        } else if (u === 'кг' || u === 'л') {
            text = String(Math.round(a * 100) / 100).replace('.', ',');
        } else {
            text = fractionText(Math.max(0.25, Math.round(a * 4) / 4));
        }
        return `${text} ${u}`;
    }

    function formatTime(totalSeconds) {
        const s = Math.max(0, totalSeconds);
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
        const pad = n => String(n).padStart(2, '0');
        return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
    }

    const formatDuration = seconds => seconds < 60 ? `${seconds} сек` : `${Math.round(seconds / 60)} мин`;

    function showToast(message) {
        el.toast.textContent = message;
        el.toast.hidden = false;
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => { el.toast.hidden = true; }, 3500);
    }

    function updateScrollLock() {
        document.body.classList.toggle('no-scroll', !el.modal.hidden || !el.dialog.hidden || !el.cook.hidden);
    }

    /* =====================================================
     *  Калории, порции и количество человек
     * ===================================================== */
    const targetKcal = mealId => Math.round(state.prefs.dailyKcal * MEAL_BY_ID[mealId].share);
    const kcalPerServingExact = r => r.kcalTotal / r.servings;

    /** Сколько порций приготовить, чтобы каждому хватило калорий на этот приём пищи */
    function recommendedServings(r, mealId) {
        const need = state.people * targetKcal(mealId);
        const byKcal = Math.ceil(need / kcalPerServingExact(r) - 0.05);
        return Math.min(MAX_SERVINGS, Math.max(state.people, byKcal));
    }

    const kcalPerPerson = (r, servings) => Math.round(kcalPerServingExact(r) * servings / state.people);

    /* =====================================================
     *  Профиль: аллергии, диета, нелюбимые продукты
     * ===================================================== */
    function profileIssues(r) {
        const p = state.prefs;
        const allergens = r.allergens.filter(a => p.allergens.includes(a));
        const dietFail = (p.diet === 'vegan' && r.diet !== 'vegan') || (p.diet === 'vegetarian' && r.diet === 'omnivore');
        const dislikes = r.productIds.filter(id => p.dislikes.includes(id)).map(id => PRODUCT_BY_ID[id].name.toLowerCase());
        return { allergens, dietFail, dislikes, blocked: allergens.length > 0 || dietFail || dislikes.length > 0 };
    }

    function issuesText(issues) {
        const parts = [];
        if (issues.allergens.length) parts.push('аллерген: ' + issues.allergens.map(a => ALLERGEN_BY_ID[a].label.toLowerCase()).join(', '));
        if (issues.dietFail) parts.push('не подходит под ваш тип питания');
        if (issues.dislikes.length) parts.push('не любите: ' + issues.dislikes.join(', '));
        return parts.join('; ');
    }

    function productIssue(prod) {
        const p = state.prefs;
        if (prod.allergens.some(a => p.allergens.includes(a))) return 'содержит ваш аллерген';
        if (p.dislikes.includes(prod.id)) return 'вы не любите этот продукт';
        if (p.diet === 'vegan' && prod.diet !== 'vegan') return 'не подходит для веганов';
        if (p.diet === 'vegetarian' && prod.diet === 'omnivore') return 'не подходит для вегетарианцев';
        return '';
    }

    function renderProfileNote() {
        const p = state.prefs;
        const parts = [];
        if (p.diet !== 'any') parts.push(DIET_LABEL[p.diet].toLowerCase());
        if (p.allergens.length) parts.push('без: ' + p.allergens.map(a => ALLERGEN_BY_ID[a].label.toLowerCase()).join(', '));
        if (p.dislikes.length) {
            const names = p.dislikes.map(id => PRODUCT_BY_ID[id] && PRODUCT_BY_ID[id].name.toLowerCase()).filter(Boolean);
            parts.push('не ем: ' + (names.length > 3 ? names.slice(0, 3).join(', ') + ' и ещё ' + (names.length - 3) : names.join(', ')));
        }
        if (!parts.length) {
            el.profileNote.innerHTML = `ℹ️ Укажите аллергии и предпочтения — мы скроем неподходящие блюда. <button class="link-btn" type="button" data-open-prefs>⚙ Настроить</button>`;
            return;
        }
        el.profileNote.innerHTML = `🛡 Учитываю ваш профиль: <b>${esc(parts.join(' · '))}</b>
            <label class="switch"><input type="checkbox" id="applyProfile" ${state.applyProfile ? 'checked' : ''}> Учитывать</label>
            <button class="link-btn" type="button" data-open-prefs>⚙ Изменить</button>`;
    }

    function updateGoalInfo() {
        el.goalInfo.textContent = `Норма: ${state.prefs.dailyKcal} ккал/день`;
    }

    function updateFavCount() { el.favCount.textContent = state.favorites.size; }

    /* =====================================================
     *  Люди (общий переключатель для всех разделов)
     * ===================================================== */
    function syncPeopleInputs() {
        if (document.activeElement !== el.peopleNumber) el.peopleNumber.value = state.people;
        const mp = $('#modalPeople', el.modalBody);
        if (mp && document.activeElement !== mp) mp.value = state.people;
    }

    function setPeople(value) {
        const n = parseInt(value, 10);
        if (Number.isNaN(n)) return;
        state.people = clampPeople(n);
        state.prefs.people = state.people;
        state.prefs = Auth.savePrefs(state.prefs);
        syncPeopleInputs();
        if (state.current && !el.modal.hidden) {
            if (!state.servingsManual) state.servings = recommendedServings(state.current, state.ctxMeal);
            refreshServingsUI();
        }
        renderCatalog();
        renderFridgeResults();
    }

    /* =====================================================
     *  Избранное
     * ===================================================== */
    function toggleFavorite(id) {
        if (state.favorites.has(id)) state.favorites.delete(id);
        else state.favorites.add(id);
        store.set(favKey(), [...state.favorites]);
        updateFavCount();
        renderCatalog();
        renderFridgeResults();
        syncModalFavButton();
    }

    /* =====================================================
     *  Карточки рецептов
     * ===================================================== */
    function renderCard(r, opts = {}) {
        const fav = state.favorites.has(r.id);
        const meal = opts.meal || r.meals[0];
        const servings = recommendedServings(r, meal);
        const issues = profileIssues(r);
        const tags = r.categories
            .map(c => `<span class="tag ${c === 'vegan' ? 'vegan' : ''}">${CATEGORY_LABEL[c]}</span>`).join('');
        const warn = issues.blocked ? `<span class="tag warn" title="${esc(issuesText(issues))}">⚠ Не для вас</span>` : '';
        return `
            <article class="card" data-id="${r.id}" data-meal="${meal}" ${opts.fromFridge ? 'data-fridge="1"' : ''} tabindex="0">
                <div class="card-img" style="--bg-card:${r.color}">${r.emoji}</div>
                <button class="fav-btn ${fav ? 'active' : ''}" type="button" data-fav="${r.id}"
                        aria-label="${fav ? 'Убрать из избранного' : 'В избранное'}">♥</button>
                <div class="card-body">
                    <h3>${r.title}</h3>
                    <p class="meta">⏱ ${r.time} мин · 🔥 ${r.calories} ккал/порция</p>
                    <p class="people-line">👥 На ${peopleText(state.people)}: <b>${servingsText(servings)}</b> · ≈${kcalPerPerson(r, servings)} ккал на человека</p>
                    ${opts.extra || ''}
                    <div class="tags">${tags}${warn}</div>
                </div>
            </article>`;
    }

    /* =====================================================
     *  Каталог
     * ===================================================== */
    function getFilteredRecipes() {
        const q = state.query.trim().toLowerCase();
        let list = RECIPES.filter(r => {
            if (state.category !== 'all' && !r.categories.includes(state.category)) return false;
            if (state.maxTime && r.time > state.maxTime) return false;
            if (state.maxCal && r.calories > state.maxCal) return false;
            if (state.favOnly && !state.favorites.has(r.id)) return false;
            if (q) {
                const inTitle = r.title.toLowerCase().includes(q);
                const inIngredients = r.ingredients.some(i => i.name.toLowerCase().includes(q));
                if (!inTitle && !inIngredients) return false;
            }
            return true;
        });

        let hidden = 0;
        if (state.applyProfile) {
            const before = list.length;
            list = list.filter(r => !profileIssues(r).blocked);
            hidden = before - list.length;
        }

        switch (state.sort) {
            case 'time': list = [...list].sort((a, b) => a.time - b.time); break;
            case 'cal': list = [...list].sort((a, b) => a.calories - b.calories); break;
            case 'name': list = [...list].sort((a, b) => a.title.localeCompare(b.title, 'ru')); break;
        }
        return { list, hidden };
    }

    function renderCatalog() {
        const { list, hidden } = getFilteredRecipes();
        el.resultsInfo.textContent = `Найдено рецептов: ${list.length}` +
            (hidden ? ` · скрыто из-за ваших предпочтений: ${hidden}` : '');
        el.grid.innerHTML = list.length
            ? list.map(r => renderCard(r)).join('')
            : '<div class="empty">😕 Ничего не найдено. Попробуйте изменить фильтры или запрос.</div>';
    }

    function renderCategoryChips() {
        el.chips.innerHTML = CATEGORIES.map(c =>
            `<button type="button" class="chip ${c.id === state.category ? 'active' : ''}" data-cat="${c.id}">${c.label}</button>`
        ).join('');
    }

    function resetFilters() {
        Object.assign(state, { query: '', category: 'all', maxTime: 0, maxCal: 0, sort: 'default', favOnly: false });
        el.search.value = '';
        el.timeFilter.value = '0';
        el.calFilter.value = '0';
        el.sortSelect.value = 'default';
        el.favToggle.classList.remove('active');
        el.favToggle.setAttribute('aria-pressed', 'false');
        renderCategoryChips();
        renderCatalog();
    }

    /* =====================================================
     *  Холодильник
     * ===================================================== */
    function saveFridge() {
        store.set(fridgeKey(), [...state.fridge]);
        el.fridgeCount.textContent = state.fridge.size;
    }

    function renderProducts() {
        const q = state.productQuery.trim().toLowerCase();
        const html = PRODUCT_GROUPS.map(g => {
            const items = PRODUCTS.filter(prod => !prod.same && prod.group === g.id && (!q || prod.name.toLowerCase().includes(q)));
            if (!items.length) return '';
            const buttons = items.map(prod => {
                const issue = productIssue(prod);
                const on = state.fridge.has(prod.id);
                return `<button type="button" class="prod ${on ? 'on' : ''} ${issue ? 'blocked' : ''}" data-prod="${prod.id}"
                        aria-pressed="${on}" ${issue ? `title="${esc(issue)}"` : ''}>${prod.emoji} ${prod.name}</button>`;
            }).join('');
            return `<div class="product-group"><h3>${g.label}</h3><div class="product-list">${buttons}</div></div>`;
        }).join('');
        el.productGroups.innerHTML = html || '<p class="hint">Такого продукта нет в списке.</p>';
        el.fridgeCount.textContent = state.fridge.size;
    }

    function renderMealChips() {
        el.mealChips.innerHTML = MEALS.map(m =>
            `<button type="button" class="chip ${m.id === state.fridgeMeal ? 'active' : ''}" data-meal="${m.id}">${m.label}</button>`
        ).join('');
    }

    function renderFridgeCard(item) {
        const { r, m } = item;
        const pct = Math.round(m.have.length / m.required.length * 100);
        const missingNames = m.missing.map(id => PRODUCT_BY_ID[id].name.toLowerCase()).join(', ');
        const extra = `
            <div class="cover">
                <div class="cover-bar"><span style="width:${pct}%"></span></div>
                <p class="cover-text">Есть ${m.have.length} из ${m.required.length} продуктов</p>
                ${m.missing.length ? `<p class="missing-line">🛒 Не хватает: ${esc(missingNames)}</p>` : '<p class="ok-line">✅ Всё есть — можно готовить!</p>'}
            </div>`;
        return renderCard(r, { meal: state.fridgeMeal, fromFridge: true, extra });
    }

    function renderFridgeResults() {
        if (state.view !== 'fridge') return;
        const meal = state.fridgeMeal;
        const target = targetKcal(meal);

        if (state.fridge.size === 0) {
            el.fridgeInfo.textContent = '';
            el.fridgeGrid.innerHTML = '<div class="empty">👈 Отметьте продукты, которые есть дома, — и мы подберём блюда на ' + MEAL_BY_ID[meal].short + '.</div>';
            return;
        }

        let items = RECIPES
            .filter(r => r.meals.includes(meal))
            .map(r => ({ r, m: fridgeMatch(r, state.fridge) }));

        let hidden = 0;
        if (state.applyProfile) {
            const before = items.length;
            items = items.filter(i => !profileIssues(i.r).blocked);
            hidden = before - items.length;
        }

        items = items.filter(i => {
            if (state.fridgeMode === 'full') return i.m.missing.length === 0;
            if (i.m.have.length === 0) return false;
            if (state.fridgeMode === 'miss2') return i.m.missing.length <= 2;
            return true;
        });

        items.sort((a, b) =>
            a.m.missing.length - b.m.missing.length ||
            (b.m.have.length / b.m.required.length) - (a.m.have.length / a.m.required.length) ||
            Math.abs(kcalPerPerson(a.r, recommendedServings(a.r, meal)) - target) -
            Math.abs(kcalPerPerson(b.r, recommendedServings(b.r, meal)) - target));

        el.fridgeInfo.textContent = `Подходит блюд: ${items.length} · ${MEAL_BY_ID[meal].short}, цель ≈ ${target} ккал на человека` +
            (hidden ? ` · скрыто из-за предпочтений: ${hidden}` : '');
        el.fridgeGrid.innerHTML = items.length
            ? items.map(renderFridgeCard).join('')
            : '<div class="empty">😕 Из этих продуктов ничего не складывается. Добавьте ещё продуктов или выберите другой режим показа.</div>';
    }

    function renderFridge() {
        renderProducts();
        renderMealChips();
        el.fridgeMode.value = state.fridgeMode;
        renderFridgeResults();
    }

    /* =====================================================
     *  Вкладки
     * ===================================================== */
    function setView(view) {
        state.view = view;
        el.tabs.forEach(t => t.classList.toggle('active', t.dataset.view === view));
        el.viewCatalog.hidden = view !== 'catalog';
        el.viewFridge.hidden = view !== 'fridge';
        el.search.hidden = view !== 'catalog';
        if (view === 'fridge') renderFridge();
        else renderCatalog();
    }

    /* =====================================================
     *  Окно рецепта + калькулятор порций
     * ===================================================== */
    function openRecipe(id, ctx = {}) {
        const r = RECIPES.find(x => x.id === id);
        if (!r) return;
        state.current = r;
        state.ctxMeal = ctx.meal && r.meals.includes(ctx.meal) ? ctx.meal : (ctx.meal || r.meals[0]);
        state.fromFridge = !!ctx.fromFridge;
        state.servings = recommendedServings(r, state.ctxMeal);
        state.servingsManual = false;

        const tags = r.categories
            .map(c => `<span class="tag ${c === 'vegan' ? 'vegan' : ''}">${CATEGORY_LABEL[c]}</span>`).join(' ');
        const allergenText = r.allergens.length
            ? 'Содержит: ' + r.allergens.map(a => ALLERGEN_BY_ID[a].label.toLowerCase()).join(', ')
            : 'Без распространённых аллергенов';
        const issues = profileIssues(r);
        const warn = issues.blocked ? `<p class="warn-box">⚠️ Это блюдо не подходит под ваш профиль — ${esc(issuesText(issues))}</p>` : '';
        const steps = r.steps.map(s =>
            `<li>${s.text}${s.timer ? `<span class="step-timer">⏲ ${formatDuration(s.timer)}</span>` : ''}</li>`).join('');
        const mealOptions = MEALS.map(m =>
            `<option value="${m.id}" ${m.id === state.ctxMeal ? 'selected' : ''}>${m.label}</option>`).join('');

        el.modalBody.innerHTML = `
            <div class="modal-head">
                <div class="modal-emoji" style="background:${r.color}">${r.emoji}</div>
                <div>
                    <h2 id="modalTitle">${r.title}</h2>
                    <p>${r.description}</p>
                    <div class="tags">${tags}</div>
                    <p class="nutrition">⏱ ${r.time} мин · 🔥 ${r.calories} ккал на порцию (всего ≈${r.kcalTotal} ккал на ${servingsText(r.servings)})<br>${allergenText}</p>
                </div>
            </div>
            ${warn}
            <div class="modal-actions">
                <button id="startCook" class="btn primary" type="button">👩‍🍳 Начать готовить</button>
                <button id="modalFav" class="btn ghost" type="button"></button>
            </div>
            <div class="modal-section">
                <div class="servings-box">
                    <div class="srow">
                        <label for="modalPeople"><b>👥 Человек:</b></label>
                        <div class="stepper">
                            <button id="modalPeopleMinus" type="button" aria-label="Меньше">−</button>
                            <input id="modalPeople" type="number" min="1" max="${MAX_PEOPLE}" value="${state.people}">
                            <button id="modalPeoplePlus" type="button" aria-label="Больше">+</button>
                        </div>
                        <label for="modalMeal"><b>Приём пищи:</b></label>
                        <select id="modalMeal">${mealOptions}</select>
                    </div>
                    <div class="srow">
                        <label for="servingsNumber"><b>Порции:</b></label>
                        <input id="servingsRange" type="range" min="${MIN_SERVINGS}" max="20" step="1" value="${state.servings}" style="flex:1;min-width:140px;accent-color:var(--accent)">
                        <div class="stepper">
                            <button id="servMinus" type="button" aria-label="Меньше">−</button>
                            <input id="servingsNumber" type="number" min="${MIN_SERVINGS}" max="${MAX_SERVINGS}" value="${state.servings}">
                            <button id="servPlus" type="button" aria-label="Больше">+</button>
                        </div>
                        <button id="autoServings" class="btn ghost small" type="button">⚖ По калориям</button>
                    </div>
                    <p id="servingsInfo" class="servings-info"></p>
                </div>
                <h3>🧾 Ингредиенты</h3>
                <ul id="ingredientsList" class="ingredients"></ul>
                <p id="totalCalories" class="nutrition"></p>
                <h3>📋 Приготовление</h3>
                <ol class="steps">${steps}</ol>
            </div>`;

        const m = el.modalBody;
        $('#modalPeople', m).addEventListener('input', e => { if (e.target.value !== '') setPeople(e.target.value); });
        $('#modalPeople', m).addEventListener('blur', () => syncPeopleInputs());
        $('#modalPeopleMinus', m).addEventListener('click', () => setPeople(state.people - 1));
        $('#modalPeoplePlus', m).addEventListener('click', () => setPeople(state.people + 1));
        $('#modalMeal', m).addEventListener('change', e => {
            state.ctxMeal = e.target.value;
            if (!state.servingsManual) state.servings = recommendedServings(r, state.ctxMeal);
            refreshServingsUI();
        });
        $('#servingsRange', m).addEventListener('input', e => setServings(e.target.value));
        const number = $('#servingsNumber', m);
        number.addEventListener('input', () => { if (number.value !== '') setServings(number.value, true); });
        number.addEventListener('blur', () => { number.value = state.servings; });
        $('#servMinus', m).addEventListener('click', () => setServings(state.servings - 1));
        $('#servPlus', m).addEventListener('click', () => setServings(state.servings + 1));
        $('#autoServings', m).addEventListener('click', () => {
            state.servingsManual = false;
            state.servings = recommendedServings(r, state.ctxMeal);
            refreshServingsUI();
        });
        $('#startCook', m).addEventListener('click', openCook);
        $('#modalFav', m).addEventListener('click', () => toggleFavorite(r.id));

        refreshServingsUI();
        syncModalFavButton();
        el.modal.hidden = false;
        updateScrollLock();
    }

    function closeRecipe() {
        el.modal.hidden = true;
        state.current = null;
        updateScrollLock();
    }

    function setServings(value, fromTyping = false) {
        let n = parseInt(value, 10);
        if (Number.isNaN(n)) return;
        state.servings = Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, n));
        state.servingsManual = true;
        refreshServingsUI(fromTyping);
    }

    function refreshServingsUI(fromTyping = false) {
        const r = state.current;
        if (!r) return;
        const range = $('#servingsRange', el.modalBody);
        const number = $('#servingsNumber', el.modalBody);
        if (!range || !number) return;
        range.max = Math.max(20, state.servings);
        range.value = state.servings;
        if (!fromTyping) number.value = state.servings;
        syncPeopleInputs();

        const perPerson = kcalPerPerson(r, state.servings);
        const target = targetKcal(state.ctxMeal);
        const ok = perPerson >= target * 0.9;
        const info = $('#servingsInfo', el.modalBody);
        info.textContent = `На ${peopleText(state.people)}: ${servingsText(state.servings)} → ≈${perPerson} ккал на человека ` +
            `(цель на ${MEAL_BY_ID[state.ctxMeal].short}: ${target} ккал). ` +
            (ok ? '✅ Хватит всем' : '⚠️ Может не хватить — добавьте порции');
        info.className = 'servings-info ' + (ok ? 'ok' : 'low');

        renderIngredients();
        if (!el.cook.hidden) renderCookIngredients();
    }

    function scaledAmount(ing) {
        if (ing.amount === null) return null;
        return ing.amount * state.servings / state.current.servings;
    }

    function renderIngredients() {
        const r = state.current;
        const list = $('#ingredientsList', el.modalBody);
        if (!r || !list) return;
        let total = 0;
        let anyMissing = false;
        list.innerHTML = r.ingredients.map(ing => {
            const a = scaledAmount(ing);
            const kcal = a === null ? 0 : Math.round(ingredientKcal(ing, a));
            total += kcal;
            const info = ingredientInfo(ing);
            const miss = state.fromFridge && info.product && !state.fridge.has(canonId(info.product));
            if (miss) anyMissing = true;
            return `<li class="${miss ? 'missing' : ''}">
                <span>${miss ? '🛒 ' : ''}${ing.name}</span>
                <span class="amount-col"><span class="amount">${formatAmount(a, ing.unit)}</span>${kcal ? `<span class="kcal">≈${kcal} ккал</span>` : ''}</span>
            </li>`;
        }).join('');
        $('#totalCalories', el.modalBody).textContent =
            `Всего на ${servingsText(state.servings)}: ≈${total} ккал.` + (anyMissing ? ' 🛒 — этого продукта нет в вашем холодильнике.' : '');
    }

    function syncModalFavButton() {
        const btn = $('#modalFav', el.modalBody);
        if (!btn || !state.current) return;
        btn.textContent = state.favorites.has(state.current.id) ? '♥ В избранном' : '♡ В избранное';
    }

    /* =====================================================
     *  Режим готовки (Cook Mode)
     * ===================================================== */
    function openCook() {
        if (!state.current) return;
        state.cook.step = 0;
        el.cookTitle.textContent = `${state.current.emoji} ${state.current.title}`;
        el.cook.hidden = false;
        updateScrollLock();
        renderCookIngredients();
        renderCookStep();
        requestWakeLock();
    }

    function closeCook(finished = false) {
        stopTimer();
        stopSpeech();
        releaseWakeLock();
        el.cook.hidden = true;
        updateScrollLock();
        if (finished) showToast('🎉 Готово! Приятного аппетита!');
    }

    function renderCookIngredients() {
        const r = state.current;
        if (!r) return;
        el.cookServings.textContent = servingsText(state.servings);
        el.cookIngredients.innerHTML = r.ingredients.map(ing =>
            `<li><span>${ing.name}</span><span class="amount">${formatAmount(scaledAmount(ing), ing.unit)}</span></li>`).join('');
    }

    function renderCookStep() {
        const r = state.current;
        const total = r.steps.length;
        const i = state.cook.step;
        const step = r.steps[i];
        el.cookCounter.textContent = `Шаг ${i + 1} из ${total}`;
        el.cookProgress.style.width = `${((i + 1) / total) * 100}%`;
        el.cookStepText.textContent = step.text;
        el.cookPrev.disabled = i === 0;
        el.cookNext.textContent = i === total - 1 ? 'Готово ✓' : 'Далее →';
        setupTimer(step);
        speak(`Шаг ${i + 1}. ${step.text}`);
    }

    function goStep(delta) {
        const total = state.current.steps.length;
        const next = state.cook.step + delta;
        if (next < 0) return;
        if (next >= total) { closeCook(true); return; }
        state.cook.step = next;
        renderCookStep();
    }

    /* ---------- Таймер (setInterval) ---------- */
    function setupTimer(step) {
        stopTimer();
        el.timerPanel.classList.remove('done');
        if (step.timer) {
            timer.total = step.timer;
            timer.remaining = step.timer;
            el.timerPanel.hidden = false;
            updateTimerUI();
        } else {
            el.timerPanel.hidden = true;
        }
    }

    function updateTimerUI() {
        el.timerDisplay.textContent = formatTime(timer.remaining);
        el.timerBar.style.width = `${timer.total ? (timer.remaining / timer.total) * 100 : 0}%`;
        el.timerStart.textContent = timer.running ? '⏸ Пауза' : (timer.remaining === 0 ? '▶ Заново' : '▶ Старт');
    }

    function startTimer() {
        if (timer.running) return;
        if (timer.remaining <= 0) timer.remaining = timer.total;
        ensureAudio();
        el.timerPanel.classList.remove('done');
        timer.running = true;
        timer.endAt = Date.now() + timer.remaining * 1000;
        timer.id = setInterval(tickTimer, 250);
        updateTimerUI();
    }

    function pauseTimer() {
        if (!timer.running) return;
        clearInterval(timer.id);
        timer.id = null;
        timer.running = false;
        updateTimerUI();
    }

    function stopTimer() {
        clearInterval(timer.id);
        timer.id = null;
        timer.running = false;
    }

    function resetTimer() {
        stopTimer();
        el.timerPanel.classList.remove('done');
        timer.remaining = timer.total;
        updateTimerUI();
    }

    function addMinute() {
        timer.total += 60;
        timer.remaining += 60;
        if (timer.running) timer.endAt += 60000;
        el.timerPanel.classList.remove('done');
        updateTimerUI();
    }

    function tickTimer() {
        const rem = Math.max(0, Math.ceil((timer.endAt - Date.now()) / 1000));
        if (rem !== timer.remaining) {
            timer.remaining = rem;
            updateTimerUI();
        }
        if (rem === 0) finishTimer();
    }

    function finishTimer() {
        stopTimer();
        timer.remaining = 0;
        updateTimerUI();
        el.timerPanel.classList.add('done');
        beep();
        speak('Таймер завершён!', true);
    }

    function toggleTimer() {
        if (el.timerPanel.hidden) return;
        timer.running ? pauseTimer() : startTimer();
    }

    /* ---------- Звук ---------- */
    function ensureAudio() {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
        } catch (e) { audioCtx = null; }
    }

    function beep() {
        ensureAudio();
        if (!audioCtx) return;
        for (let i = 0; i < 3; i++) {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            const t0 = audioCtx.currentTime + i * 0.35;
            osc.type = 'sine';
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.0001, t0);
            gain.gain.exponentialRampToValueAtTime(0.4, t0 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
            osc.connect(gain).connect(audioCtx.destination);
            osc.start(t0);
            osc.stop(t0 + 0.3);
        }
    }

    /* ---------- Голосовые подсказки (Web Speech API) ---------- */
    const speechSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

    function speak(text, force = false) {
        if (!speechSupported || (!state.cook.voice && !force)) return;
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'ru-RU';
        utter.rate = 0.95;
        const voice = window.speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith('ru'));
        if (voice) utter.voice = voice;
        window.speechSynthesis.speak(utter);
    }

    function stopSpeech() { if (speechSupported) window.speechSynthesis.cancel(); }

    function updateVoiceButton() {
        el.voiceToggle.textContent = state.cook.voice ? '🔊 Голос вкл.' : '🔇 Голос выкл.';
        el.voiceToggle.setAttribute('aria-pressed', String(state.cook.voice));
    }

    function toggleVoice() {
        if (!speechSupported) { showToast('Ваш браузер не поддерживает синтез речи'); return; }
        state.cook.voice = !state.cook.voice;
        updateVoiceButton();
        if (state.cook.voice) {
            const step = state.current.steps[state.cook.step];
            speak(`Шаг ${state.cook.step + 1}. ${step.text}`);
        } else {
            stopSpeech();
        }
    }

    function repeatStep() {
        if (!speechSupported) { showToast('Ваш браузер не поддерживает синтез речи'); return; }
        const step = state.current.steps[state.cook.step];
        speak(`Шаг ${state.cook.step + 1}. ${step.text}`, true);
    }

    async function requestWakeLock() {
        try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); }
        catch (e) { wakeLock = null; }
    }

    function releaseWakeLock() {
        if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
    }

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && !el.cook.hidden) requestWakeLock();
    });

    /* =====================================================
     *  Вход, регистрация, профиль
     * ===================================================== */
    function updateAuthButton() {
        const user = Auth.current();
        el.authBtn.textContent = user ? `👤 ${user.name}` : '👤 Войти';
    }

    function openDialog(html) {
        el.dialogBody.innerHTML = html;
        el.dialog.hidden = false;
        updateScrollLock();
    }

    function closeDialog() {
        el.dialog.hidden = true;
        el.dialogBody.innerHTML = '';
        updateScrollLock();
    }

    function prefsFormHtml(prefs) {
        const diets = Object.entries(DIET_LABEL).map(([id, label]) =>
            `<label class="pill"><input type="radio" name="diet" value="${id}" ${prefs.diet === id ? 'checked' : ''}> ${label}</label>`).join('');
        const allergens = ALLERGENS.map(a =>
            `<label class="pill"><input type="checkbox" name="allergen" value="${a.id}" ${prefs.allergens.includes(a.id) ? 'checked' : ''}> ${a.emoji} ${a.label}</label>`).join('');
        const dislikes = PRODUCTS.filter(x => !x.same).map(x =>
            `<label class="pill small"><input type="checkbox" name="dislike" value="${x.id}" ${prefs.dislikes.includes(x.id) ? 'checked' : ''}> ${x.emoji} ${x.name}</label>`).join('');
        const shares = MEALS.map(m => `${m.short} ${Math.round(m.share * 100)}%`).join(' · ');
        return `
            <div class="pref-block">
                <h4>🥗 Тип питания</h4>
                <div class="pill-row">${diets}</div>
            </div>
            <div class="pref-block">
                <h4>🚫 Аллергии и непереносимость</h4>
                <div class="pill-row">${allergens}</div>
                <p class="hint">Блюда с этими аллергенами будут скрыты.</p>
            </div>
            <div class="pref-block">
                <h4>👎 Не ем / не люблю</h4>
                <div class="chip-box">${dislikes}</div>
            </div>
            <div class="pref-block">
                <h4>🔥 Калорийность</h4>
                <label class="field">Норма, ккал в день на одного человека
                    <input type="number" name="dailyKcal" min="800" max="6000" step="50" value="${prefs.dailyKcal}">
                </label>
                <details class="calc">
                    <summary>Рассчитать мою норму</summary>
                    <div class="calc-grid">
                        <label class="field">Пол
                            <select name="calcSex"><option value="m">Мужской</option><option value="f">Женский</option></select></label>
                        <label class="field">Возраст
                            <input type="number" name="calcAge" min="14" max="100" value="30"></label>
                        <label class="field">Вес, кг
                            <input type="number" name="calcWeight" min="30" max="250" value="70"></label>
                        <label class="field">Рост, см
                            <input type="number" name="calcHeight" min="120" max="230" value="170"></label>
                        <label class="field">Активность
                            <select name="calcActivity">
                                <option value="1.2">Сидячая</option>
                                <option value="1.375" selected>Лёгкая (1–3 тренировки)</option>
                                <option value="1.55">Средняя (3–5 тренировок)</option>
                                <option value="1.725">Высокая (6–7 тренировок)</option>
                            </select></label>
                        <label class="field">Цель
                            <select name="calcGoal">
                                <option value="0.85">Похудеть</option>
                                <option value="1" selected>Поддерживать вес</option>
                                <option value="1.1">Набрать массу</option>
                            </select></label>
                    </div>
                    <button type="button" class="btn primary small" id="calcKcal">Рассчитать</button>
                </details>
                <p class="hint">Разбивка по приёмам пищи: ${shares}.</p>
            </div>
            <div class="pref-block">
                <label class="field">👥 Обычно готовлю на (человек)
                    <input type="number" name="people" min="1" max="${MAX_PEOPLE}" value="${prefs.people}">
                </label>
            </div>`;
    }

    function collectPrefs(form) {
        return Auth.normalizePrefs({
            diet: form.elements.diet.value || 'any',
            allergens: $$('input[name="allergen"]:checked', form).map(i => i.value),
            dislikes: $$('input[name="dislike"]:checked', form).map(i => i.value),
            dailyKcal: form.elements.dailyKcal.value,
            people: form.elements.people.value
        });
    }

    function calcDailyKcal(form) {
        const f = form.elements;
        const w = Number(f.calcWeight.value), h = Number(f.calcHeight.value), age = Number(f.calcAge.value);
        const bmr = 10 * w + 6.25 * h - 5 * age + (f.calcSex.value === 'm' ? 5 : -161);   // формула Миффлина — Сан-Жеора
        const kcal = bmr * Number(f.calcActivity.value) * Number(f.calcGoal.value);
        f.dailyKcal.value = Math.max(800, Math.round(kcal / 50) * 50);
    }

    function showAuth(tab = 'login') {
        const tabs = `<div class="dialog-tabs">
            <button type="button" class="chip ${tab === 'login' ? 'active' : ''}" data-auth-tab="login">Вход</button>
            <button type="button" class="chip ${tab === 'register' ? 'active' : ''}" data-auth-tab="register">Регистрация</button>
        </div>`;
        const body = tab === 'login'
            ? `<form id="loginForm" class="form" novalidate>
                    <label class="field">E-mail<input type="email" name="email" autocomplete="email" required></label>
                    <label class="field">Пароль<input type="password" name="password" autocomplete="current-password" required></label>
                    <p id="formError" class="form-error" hidden></p>
                    <button class="btn primary" type="submit">Войти</button>
                    <p class="hint">Нет аккаунта? Зарегистрируйтесь — и укажите аллергии и предпочтения.</p>
               </form>`
            : `<form id="registerForm" class="form" novalidate>
                    <label class="field">Имя<input type="text" name="name" autocomplete="name" required></label>
                    <label class="field">E-mail<input type="email" name="email" autocomplete="email" required></label>
                    <label class="field">Пароль (не короче 6 символов)<input type="password" name="password" autocomplete="new-password" required></label>
                    ${prefsFormHtml(state.prefs)}
                    <p id="formError" class="form-error" hidden></p>
                    <button class="btn primary" type="submit">Создать аккаунт</button>
                    <p class="hint">Аккаунты хранятся только в этом браузере (localStorage).</p>
               </form>`;
        openDialog(`<div class="dialog-pad"><h2>${tab === 'login' ? 'Вход' : 'Регистрация'}</h2>${tabs}${body}</div>`);
    }

    function showProfile() {
        const user = Auth.current();
        const head = user
            ? `<h2>👤 ${esc(user.name)}</h2><p class="who">${esc(user.email)}</p>`
            : `<h2>⚙ Предпочтения</h2><p class="who">Вы не вошли. Настройки сохранятся в этом браузере.
                <button class="link-btn" type="button" data-auth-tab="login">Войти</button> ·
                <button class="link-btn" type="button" data-auth-tab="register">Регистрация</button></p>`;
        openDialog(`<div class="dialog-pad">${head}
            <form id="prefsForm" class="form" novalidate>
                ${prefsFormHtml(state.prefs)}
                <button class="btn primary" type="submit">Сохранить</button>
                ${user ? '<button class="btn ghost" type="button" id="logoutBtn">Выйти из аккаунта</button>' : ''}
            </form></div>`);
    }

    function showFormError(message) {
        const box = $('#formError', el.dialogBody);
        if (!box) return;
        box.textContent = message;
        box.hidden = false;
    }

    function afterAuthChange() {
        loadUserData();
        updateAuthButton();
        renderAll();
    }

    el.dialog.addEventListener('click', e => {
        if (e.target.closest('[data-close-dialog]')) { closeDialog(); return; }
        const tabBtn = e.target.closest('[data-auth-tab]');
        if (tabBtn) { showAuth(tabBtn.dataset.authTab); return; }
        if (e.target.closest('#calcKcal')) { calcDailyKcal(e.target.closest('form')); return; }
        if (e.target.closest('#logoutBtn')) {
            Auth.logout();
            closeDialog();
            afterAuthChange();
            showToast('Вы вышли из аккаунта');
        }
    });

    el.dialog.addEventListener('submit', e => {
        e.preventDefault();
        const form = e.target;
        const f = form.elements;

        if (form.id === 'loginForm') {
            const res = Auth.login({ email: f.email.value, password: f.password.value });
            if (!res.ok) { showFormError(res.error); return; }
            closeDialog();
            afterAuthChange();
            showToast(`Добро пожаловать, ${Auth.current().name}!`);
        } else if (form.id === 'registerForm') {
            const guestFav = [...state.favorites];
            const guestFridge = [...state.fridge];
            const res = Auth.register({
                name: f.name.value, email: f.email.value, password: f.password.value, prefs: collectPrefs(form)
            });
            if (!res.ok) { showFormError(res.error); return; }
            // переносим то, что гость уже успел сохранить, в новый аккаунт
            store.set(favKey(), guestFav);
            store.set(fridgeKey(), guestFridge);
            closeDialog();
            afterAuthChange();
            showToast(`Аккаунт создан. Добро пожаловать, ${Auth.current().name}!`);
        } else if (form.id === 'prefsForm') {
            state.prefs = Auth.savePrefs(collectPrefs(form));
            state.people = clampPeople(state.prefs.people);
            closeDialog();
            renderAll();
            showToast('Предпочтения сохранены');
        }
    });

    /* =====================================================
     *  Общая отрисовка
     * ===================================================== */
    function renderAll() {
        updateFavCount();
        syncPeopleInputs();
        updateGoalInfo();
        renderProfileNote();
        renderCategoryChips();
        if (state.view === 'fridge') renderFridge();
        else renderCatalog();
    }

    /* =====================================================
     *  Обработчики событий
     * ===================================================== */
    el.search.addEventListener('input', () => { state.query = el.search.value; renderCatalog(); });

    el.chips.addEventListener('click', e => {
        const btn = e.target.closest('[data-cat]');
        if (!btn) return;
        state.category = btn.dataset.cat;
        renderCategoryChips();
        renderCatalog();
    });

    el.timeFilter.addEventListener('change', () => { state.maxTime = Number(el.timeFilter.value); renderCatalog(); });
    el.calFilter.addEventListener('change', () => { state.maxCal = Number(el.calFilter.value); renderCatalog(); });
    el.sortSelect.addEventListener('change', () => { state.sort = el.sortSelect.value; renderCatalog(); });
    el.resetFilters.addEventListener('click', resetFilters);

    el.favToggle.addEventListener('click', () => {
        if (state.view !== 'catalog') setView('catalog');
        state.favOnly = !state.favOnly;
        el.favToggle.classList.toggle('active', state.favOnly);
        el.favToggle.setAttribute('aria-pressed', String(state.favOnly));
        renderCatalog();
    });

    el.authBtn.addEventListener('click', () => { Auth.current() ? showProfile() : showAuth('login'); });

    el.tabs.forEach(t => t.addEventListener('click', () => setView(t.dataset.view)));

    // количество человек
    el.peopleNumber.addEventListener('input', () => { if (el.peopleNumber.value !== '') setPeople(el.peopleNumber.value); });
    el.peopleNumber.addEventListener('blur', () => { el.peopleNumber.value = state.people; });
    el.peopleMinus.addEventListener('click', () => setPeople(state.people - 1));
    el.peoplePlus.addEventListener('click', () => setPeople(state.people + 1));

    // плашка профиля
    el.profileNote.addEventListener('click', e => { if (e.target.closest('[data-open-prefs]')) showProfile(); });
    el.profileNote.addEventListener('change', e => {
        if (e.target.id === 'applyProfile') {
            state.applyProfile = e.target.checked;
            renderCatalog();
            renderFridgeResults();
        }
    });

    // карточки (каталог и холодильник)
    function onGridClick(e) {
        const favBtn = e.target.closest('[data-fav]');
        if (favBtn) { e.stopPropagation(); toggleFavorite(favBtn.dataset.fav); return; }
        const card = e.target.closest('.card');
        if (card) openRecipe(card.dataset.id, { meal: card.dataset.meal, fromFridge: !!card.dataset.fridge });
    }

    function onGridKey(e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const card = e.target.closest('.card');
        if (card && e.target === card) {
            e.preventDefault();
            openRecipe(card.dataset.id, { meal: card.dataset.meal, fromFridge: !!card.dataset.fridge });
        }
    }

    el.grid.addEventListener('click', onGridClick);
    el.grid.addEventListener('keydown', onGridKey);
    el.fridgeGrid.addEventListener('click', onGridClick);
    el.fridgeGrid.addEventListener('keydown', onGridKey);

    // холодильник
    el.productGroups.addEventListener('click', e => {
        const btn = e.target.closest('[data-prod]');
        if (!btn) return;
        const id = btn.dataset.prod;
        if (state.fridge.has(id)) state.fridge.delete(id); else state.fridge.add(id);
        btn.classList.toggle('on', state.fridge.has(id));
        btn.setAttribute('aria-pressed', String(state.fridge.has(id)));
        saveFridge();
        renderFridgeResults();
    });

    el.productSearch.addEventListener('input', () => { state.productQuery = el.productSearch.value; renderProducts(); });
    el.fridgeClear.addEventListener('click', () => {
        state.fridge.clear();
        saveFridge();
        renderProducts();
        renderFridgeResults();
    });
    el.mealChips.addEventListener('click', e => {
        const btn = e.target.closest('[data-meal]');
        if (!btn) return;
        state.fridgeMeal = btn.dataset.meal;
        renderMealChips();
        renderFridgeResults();
    });
    el.fridgeMode.addEventListener('change', () => { state.fridgeMode = el.fridgeMode.value; renderFridgeResults(); });

    // окно рецепта
    el.modal.addEventListener('click', e => { if (e.target.closest('[data-close-modal]')) closeRecipe(); });

    // режим готовки
    el.cookPrev.addEventListener('click', () => goStep(-1));
    el.cookNext.addEventListener('click', () => goStep(1));
    el.cookExit.addEventListener('click', () => closeCook(false));
    el.cookRepeat.addEventListener('click', repeatStep);
    el.voiceToggle.addEventListener('click', toggleVoice);
    el.timerStart.addEventListener('click', toggleTimer);
    el.timerReset.addEventListener('click', resetTimer);
    el.timerPlus.addEventListener('click', addMinute);

    document.addEventListener('keydown', e => {
        if (!el.cook.hidden) {
            if (e.key === 'ArrowRight') { e.preventDefault(); goStep(1); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); goStep(-1); }
            else if (e.key === ' ' && !e.target.closest('button, summary')) { e.preventDefault(); toggleTimer(); }
            else if (e.key.toLowerCase() === 'v' || e.key.toLowerCase() === 'м') repeatStep();
            else if (e.key === 'Escape') closeCook(false);
            return;
        }
        if (e.key === 'Escape') {
            if (!el.dialog.hidden) closeDialog();
            else if (!el.modal.hidden) closeRecipe();
        }
    });

    /* =====================================================
     *  Старт
     * ===================================================== */
    if (speechSupported) {
        window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    } else {
        el.voiceToggle.hidden = true;
        el.cookRepeat.hidden = true;
    }

    loadUserData();
    updateVoiceButton();
    updateAuthButton();
    renderAll();
})();
