'use strict';

/*
 * База продуктов: калорийность (ккал на 100 г/мл), аллергены, тип питания,
 * вес «штуки» и ложек. По ней считаются калории каждого блюда, аллергены,
 * подбор блюд из холодильника и фильтры профиля.
 */

const MEALS = [
    { id: 'breakfast', label: '🌅 Завтрак', short: 'завтрак', share: 0.25 },
    { id: 'lunch', label: '☀️ Обед', short: 'обед', share: 0.35 },
    { id: 'dinner', label: '🌙 Ужин', short: 'ужин', share: 0.30 },
    { id: 'snack', label: '🍰 Десерт / перекус', short: 'десерт или перекус', share: 0.10 }
];

const ALLERGENS = [
    { id: 'gluten', label: 'Глютен', emoji: '🌾' },
    { id: 'dairy', label: 'Молоко / лактоза', emoji: '🥛' },
    { id: 'eggs', label: 'Яйца', emoji: '🥚' },
    { id: 'nuts', label: 'Орехи', emoji: '🥜' },
    { id: 'fish', label: 'Рыба', emoji: '🐟' },
    { id: 'soy', label: 'Соя', emoji: '🫘' },
    { id: 'sesame', label: 'Кунжут', emoji: '🌱' }
];

const PRODUCT_GROUPS = [
    { id: 'veg', label: '🥦 Овощи и зелень' },
    { id: 'fruit', label: '🍎 Фрукты' },
    { id: 'meat', label: '🍗 Мясо и рыба' },
    { id: 'dairy', label: '🧀 Молочное и яйца' },
    { id: 'grain', label: '🌾 Крупы, хлеб, паста' },
    { id: 'other', label: '🧂 Бакалея и прочее' }
];

/* p(id, название, эмодзи, группа, ккал/100г, ключевые слова, {diet, allergens, g, same}) */
function p(id, name, emoji, group, kcal, keys, extra = {}) {
    return {
        id, name, emoji, group, kcal, keys,
        diet: extra.diet || 'vegan',          // vegan | vegetarian | omnivore
        allergens: extra.allergens || [],
        g: extra.g || {},                     // граммы в 1 шт / 1 ст. л. / 1 ч. л.
        same: extra.same || null              // считается тем же продуктом в холодильнике
    };
}

const PRODUCTS = [
    // овощи и зелень
    p('tomato', 'Помидоры', '🍅', 'veg', 18, ['помидор'], { g: { 'шт': 120 } }),
    p('cucumber', 'Огурцы', '🥒', 'veg', 15, ['огур'], { g: { 'шт': 120 } }),
    p('pepper', 'Болгарский перец', '🫑', 'veg', 27, ['болгарский перец'], { g: { 'шт': 150 } }),
    p('onion', 'Лук', '🧅', 'veg', 41, ['лук'], { g: { 'шт': 100 } }),
    p('garlic', 'Чеснок', '🧄', 'veg', 149, ['чеснок'], { g: { 'шт': 4 } }),
    p('carrot', 'Морковь', '🥕', 'veg', 41, ['морков'], { g: { 'шт': 80 } }),
    p('potato', 'Картофель', '🥔', 'veg', 77, ['картоф', 'картошк'], { g: { 'шт': 120 } }),
    p('zucchini', 'Кабачок', '🥒', 'veg', 17, ['кабачок', 'кабачк'], { g: { 'шт': 300 } }),
    p('eggplant', 'Баклажан', '🍆', 'veg', 24, ['баклажан'], { g: { 'шт': 250 } }),
    p('spinach', 'Шпинат', '🥬', 'veg', 23, ['шпинат']),
    p('mushrooms', 'Шампиньоны', '🍄', 'veg', 22, ['шампиньон', 'гриб']),
    p('dill', 'Укроп и зелень', '🌿', 'veg', 43, ['укроп', 'петрушк', 'зелен']),
    p('basil', 'Базилик', '🌿', 'veg', 22, ['базилик']),
    p('avocado', 'Авокадо', '🥑', 'veg', 160, ['авокадо'], { g: { 'шт': 150 } }),
    p('olives', 'Оливки', '🫒', 'veg', 115, ['оливки', 'маслин']),
    // фрукты
    p('banana', 'Бананы', '🍌', 'fruit', 89, ['банан'], { g: { 'шт': 120 } }),
    p('apple', 'Яблоки', '🍎', 'fruit', 52, ['яблок'], { g: { 'шт': 180 } }),
    p('mango', 'Манго', '🥭', 'fruit', 60, ['манго'], { g: { 'шт': 250 } }),
    p('lemon', 'Лимон', '🍋', 'fruit', 25, ['лимон'], { g: { 'шт': 100, 'ст. л.': 15, 'ч. л.': 5 } }),
    // мясо и рыба
    p('chickenThigh', 'Куриные бёдра', '🍗', 'meat', 170, ['куриные бёдра', 'курица'], { diet: 'omnivore' }),
    p('chickenBreast', 'Куриная грудка', '🍗', 'meat', 120, ['куриная грудка', 'куриное филе'], { diet: 'omnivore' }),
    p('bacon', 'Бекон', '🥓', 'meat', 540, ['бекон', 'гуанчиале'], { diet: 'omnivore' }),
    p('salmon', 'Лосось', '🐟', 'meat', 208, ['лосос'], { diet: 'omnivore', allergens: ['fish'] }),
    // молочное и яйца
    p('egg', 'Яйца', '🥚', 'dairy', 155, ['яйц'], { diet: 'vegetarian', allergens: ['eggs'], g: { 'шт': 55 } }),
    p('yolk', 'Яичные желтки', '🥚', 'dairy', 320, ['желтк'], { diet: 'vegetarian', allergens: ['eggs'], g: { 'шт': 18 }, same: 'egg' }),
    p('milk', 'Молоко', '🥛', 'dairy', 60, ['молоко'], { diet: 'vegetarian', allergens: ['dairy'] }),
    p('cottage', 'Творог', '🧀', 'dairy', 121, ['творог'], { diet: 'vegetarian', allergens: ['dairy'] }),
    p('cheese', 'Сыр', '🧀', 'dairy', 350, ['сыр'], { diet: 'vegetarian', allergens: ['dairy'] }),
    p('parmesan', 'Пармезан', '🧀', 'dairy', 400, ['пармезан'], { diet: 'vegetarian', allergens: ['dairy'] }),
    p('feta', 'Фета / брынза', '🧀', 'dairy', 260, ['фета', 'брынза'], { diet: 'vegetarian', allergens: ['dairy'] }),
    p('butter', 'Сливочное масло', '🧈', 'dairy', 740, ['сливочное масло'], { diet: 'vegetarian', allergens: ['dairy'], g: { 'ст. л.': 18 } }),
    p('plantMilk', 'Растительное молоко', '🥛', 'dairy', 45, ['растительное молоко']),
    // крупы, хлеб, паста
    p('oats', 'Овсяные хлопья', '🥣', 'grain', 370, ['овсян'], { allergens: ['gluten'] }),
    p('rice', 'Рис', '🍚', 'grain', 350, ['рис']),
    p('buckwheat', 'Гречка', '🌾', 'grain', 340, ['гречк']),
    p('pasta', 'Макароны и спагетти', '🍝', 'grain', 350, ['спагетти', 'макарон', 'лапша', 'паста'], { allergens: ['gluten'] }),
    p('bread', 'Хлеб', '🍞', 'grain', 250, ['хлеб'], { allergens: ['gluten'], g: { 'шт': 30 } }),
    p('flour', 'Мука', '🌾', 'grain', 364, ['мук'], { allergens: ['gluten'] }),
    p('lentils', 'Красная чечевица', '🫘', 'grain', 350, ['чечевиц']),
    p('chickpeas', 'Нут', '🫘', 'grain', 119, ['нут']),
    // бакалея и прочее
    p('sugar', 'Сахар', '🍬', 'other', 400, ['сахар'], { g: { 'ст. л.': 25, 'ч. л.': 8 } }),
    p('oil', 'Растительное масло', '🫗', 'other', 900, ['растительное масло'], { g: { 'ст. л.': 14, 'ч. л.': 5 } }),
    p('oliveOil', 'Оливковое масло', '🫒', 'other', 884, ['оливковое масло'], { g: { 'ст. л.': 14, 'ч. л.': 5 } }),
    p('tahini', 'Тахини', '🥜', 'other', 595, ['тахини'], { allergens: ['sesame'], g: { 'ст. л.': 15 } }),
    p('tomatoPaste', 'Томатная паста', '🍅', 'other', 82, ['томатная паста'], { g: { 'ст. л.': 20 } }),
    p('soy', 'Соевый соус', '🧴', 'other', 60, ['соевый соус'], { allergens: ['soy', 'gluten'], g: { 'ст. л.': 18 } }),
    p('maple', 'Кленовый сироп', '🍯', 'other', 260, ['кленовый сироп'], { g: { 'ст. л.': 20 } }),
    p('walnuts', 'Грецкие орехи', '🌰', 'other', 650, ['грецкие орехи', 'орех'], { allergens: ['nuts'] }),
    p('chocolate', 'Тёмный шоколад', '🍫', 'other', 540, ['шоколад']),
    p('cocoa', 'Какао-порошок', '🍫', 'other', 230, ['какао']),
    p('chia', 'Семена чиа', '🌱', 'other', 490, ['чиа']),
    p('coconutFlakes', 'Кокосовая стружка', '🥥', 'other', 660, ['кокосовая стружка']),
    p('coconutMilk', 'Кокосовое молоко', '🥥', 'other', 185, ['кокосовое молоко'])
];

const PRODUCT_BY_ID = Object.fromEntries(PRODUCTS.map(x => [x.id, x]));
const ALLERGEN_BY_ID = Object.fromEntries(ALLERGENS.map(a => [a.id, a]));

/* Продукты, которые считаем «всегда есть на кухне» (специи, вода) */
const PANTRY_RX = /^(соль|вода|холодная вода|корица|зира|паприка|лавровый лист|разрыхлитель|ванильный|чёрный перец|перец)/;

const _esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
PRODUCTS.forEach(prod => {
    prod.rx = prod.keys.map(k => ({ len: k.length, re: new RegExp('(^|[^а-яёa-z])' + _esc(k)) }));
});

/** Ищет продукт по названию ингредиента: побеждает самое длинное совпавшее ключевое слово */
function matchProduct(name) {
    const n = name.toLowerCase();
    let best = null, bestLen = 0;
    for (const prod of PRODUCTS) {
        for (const k of prod.rx) {
            if (k.len > bestLen && k.re.test(n)) { best = prod; bestLen = k.len; }
        }
    }
    return best;
}

function canonId(prod) { return prod.same || prod.id; }

/** { product, pantry } для ингредиента рецепта (результат кэшируется) */
function ingredientInfo(ing) {
    if (!ing._info) {
        const n = ing.name.toLowerCase();
        ing._info = PANTRY_RX.test(n) ? { product: null, pantry: true } : { product: matchProduct(n), pantry: false };
    }
    return ing._info;
}

function ingredientGrams(ing, amount) {
    const prod = ingredientInfo(ing).product;
    if (!prod || amount === null || amount === undefined) return 0;
    const g = prod.g || {};
    switch (ing.unit) {
        case 'шт': return amount * (g['шт'] || 100);
        case 'ст. л.': return amount * (g['ст. л.'] || 15);
        case 'ч. л.': return amount * (g['ч. л.'] || (g['ст. л.'] || 15) / 3);
        default: return amount; // г, мл
    }
}

/** Калорийность ингредиента при заданном количестве */
function ingredientKcal(ing, amount) {
    const prod = ingredientInfo(ing).product;
    if (!prod) return 0;
    return ingredientGrams(ing, amount) * prod.kcal / 100;
}

/** Какие продукты рецепта есть в холодильнике (набор id канонических продуктов) */
function fridgeMatch(recipe, fridgeSet) {
    const have = [], missing = [];
    recipe.productIds.forEach(id => (fridgeSet.has(id) ? have : missing).push(id));
    return { required: recipe.productIds, have, missing };
}

/* Считаем калории, аллергены и тип питания каждого рецепта по составу */
RECIPES.forEach(r => {
    const ids = new Set();
    const allergens = new Set();
    let kcal = 0;
    let diet = 'vegan';
    r.ingredients.forEach(ing => {
        const info = ingredientInfo(ing);
        if (info.product) {
            const prod = info.product;
            ids.add(canonId(prod));
            prod.allergens.forEach(a => allergens.add(a));
            if (prod.diet === 'omnivore') diet = 'omnivore';
            else if (prod.diet === 'vegetarian' && diet === 'vegan') diet = 'vegetarian';
            kcal += ingredientKcal(ing, ing.amount);
        } else if (!info.pantry) {
            console.warn('Неизвестный ингредиент:', r.id, ing.name);
        }
    });
    r.kcalTotal = Math.round(kcal);
    r.calories = Math.max(5, Math.round(kcal / r.servings / 5) * 5);
    r.productIds = [...ids];
    r.allergens = [...allergens];
    r.diet = diet;
});
