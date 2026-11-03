'use strict';

/*
 * Дополнительные рецепты + привязка рецептов к приёмам пищи.
 * Загружается после data.js и до products.js.
 */
RECIPES.push(
    {
        id: 'avocado-toast',
        title: 'Тосты с авокадо и яйцом',
        emoji: '🥑', color: '#e3f2c1',
        categories: ['breakfast'],
        time: 10, calories: 0, servings: 2,
        description: 'Хрустящие тосты с кремовым авокадо и яйцом пашот или глазуньей.',
        ingredients: [
            { name: 'хлеб (ломтики)', amount: 4, unit: 'шт' },
            { name: 'авокадо', amount: 1, unit: 'шт' },
            { name: 'яйцо', amount: 2, unit: 'шт' },
            { name: 'лимонный сок', amount: 1, unit: 'ч. л.' },
            { name: 'оливковое масло', amount: 1, unit: 'ч. л.' },
            { name: 'соль', amount: null }
        ],
        steps: [
            { text: 'Поджарьте ломтики хлеба на сухой сковороде по 2 минуты с каждой стороны.', timer: 240 },
            { text: 'Разомните авокадо вилкой с лимонным соком и солью.' },
            { text: 'Пожарьте яйца-глазунью на оливковом масле 3 минуты.', timer: 180 },
            { text: 'Намажьте авокадо на тосты и сверху выложите яйца.' }
        ]
    },
    {
        id: 'chicken-rice',
        title: 'Курица с рисом и овощами',
        emoji: '🍛', color: '#fde0b5',
        categories: ['main'],
        time: 40, calories: 0, servings: 2,
        description: 'Сытное блюдо в одной сковороде: рис пропитывается соком курицы и овощей.',
        ingredients: [
            { name: 'куриная грудка', amount: 300, unit: 'г' },
            { name: 'рис', amount: 150, unit: 'г' },
            { name: 'морковь', amount: 1, unit: 'шт' },
            { name: 'болгарский перец', amount: 1, unit: 'шт' },
            { name: 'лук', amount: 1, unit: 'шт' },
            { name: 'растительное масло', amount: 1, unit: 'ст. л.' },
            { name: 'соевый соус', amount: 2, unit: 'ст. л.' },
            { name: 'вода', amount: 300, unit: 'мл' },
            { name: 'соль', amount: null }
        ],
        steps: [
            { text: 'Нарежьте курицу кубиками, овощи — соломкой.' },
            { text: 'Обжарьте курицу в масле 6 минут до золотистого цвета.', timer: 360 },
            { text: 'Добавьте лук, морковь и перец и жарьте ещё 4 минуты.', timer: 240 },
            { text: 'Всыпьте промытый рис, влейте воду и соевый соус и доведите до кипения.' },
            { text: 'Накройте крышкой и готовьте на слабом огне 18 минут.', timer: 1080 },
            { text: 'Оставьте под крышкой на 5 минут и перемешайте.', timer: 300 }
        ]
    },
    {
        id: 'buckwheat-mushrooms',
        title: 'Гречка с грибами и луком',
        emoji: '🍄', color: '#e9dcc3',
        categories: ['vegan', 'main'],
        time: 30, calories: 0, servings: 2,
        description: 'Рассыпчатая гречка с обжаренными шампиньонами — просто и сытно.',
        ingredients: [
            { name: 'гречка', amount: 160, unit: 'г' },
            { name: 'шампиньоны', amount: 250, unit: 'г' },
            { name: 'лук', amount: 1, unit: 'шт' },
            { name: 'растительное масло', amount: 2, unit: 'ст. л.' },
            { name: 'вода', amount: 320, unit: 'мл' },
            { name: 'укроп', amount: 10, unit: 'г' },
            { name: 'соль', amount: null }
        ],
        steps: [
            { text: 'Промойте гречку, залейте водой, посолите и доведите до кипения.' },
            { text: 'Накройте крышкой и варите на слабом огне 15 минут.', timer: 900 },
            { text: 'Нарежьте грибы пластинками, лук — полукольцами.' },
            { text: 'Обжарьте лук в масле 3 минуты.', timer: 180 },
            { text: 'Добавьте грибы и жарьте ещё 8 минут до испарения влаги.', timer: 480 },
            { text: 'Смешайте гречку с грибами и посыпьте рубленым укропом.' }
        ]
    },
    {
        id: 'greek-salad',
        title: 'Греческий салат',
        emoji: '🥗', color: '#d7f0d0',
        categories: ['main'],
        time: 15, calories: 0, servings: 2,
        description: 'Свежие овощи, фета и оливки с лимонно-масляной заправкой.',
        ingredients: [
            { name: 'огурцы', amount: 2, unit: 'шт' },
            { name: 'помидоры', amount: 3, unit: 'шт' },
            { name: 'болгарский перец', amount: 1, unit: 'шт' },
            { name: 'красный лук', amount: 0.5, unit: 'шт' },
            { name: 'фета', amount: 100, unit: 'г' },
            { name: 'оливки', amount: 40, unit: 'г' },
            { name: 'оливковое масло', amount: 2, unit: 'ст. л.' },
            { name: 'лимонный сок', amount: 1, unit: 'ст. л.' },
            { name: 'соль', amount: null }
        ],
        steps: [
            { text: 'Нарежьте огурцы и помидоры крупными кусками, перец — полосками, лук — тонкими полукольцами.' },
            { text: 'Выложите овощи и оливки в миску.' },
            { text: 'Заправьте маслом с лимонным соком и солью и аккуратно перемешайте.' },
            { text: 'Сверху положите кусочки феты и сразу подавайте.' }
        ]
    },
    {
        id: 'salmon-potato',
        title: 'Лосось с картофелем в духовке',
        emoji: '🐟', color: '#ffd9cc',
        categories: ['main'],
        time: 40, calories: 0, servings: 2,
        description: 'Запечённый лосось с лимоном на подушке из хрустящего картофеля.',
        ingredients: [
            { name: 'лосось', amount: 300, unit: 'г' },
            { name: 'картофель', amount: 400, unit: 'г' },
            { name: 'лимон', amount: 0.5, unit: 'шт' },
            { name: 'оливковое масло', amount: 2, unit: 'ст. л.' },
            { name: 'зубчики чеснока', amount: 2, unit: 'шт' },
            { name: 'укроп', amount: 10, unit: 'г' },
            { name: 'соль и перец', amount: null }
        ],
        steps: [
            { text: 'Разогрейте духовку до 200 °C.' },
            { text: 'Нарежьте картофель дольками, смешайте с маслом, чесноком и солью и выложите на противень.' },
            { text: 'Запекайте картофель 15 минут.', timer: 900 },
            { text: 'Положите на противень лосось, сбрызните лимонным соком и запекайте ещё 15 минут.', timer: 900 },
            { text: 'Посыпьте укропом и подавайте с дольками лимона.' }
        ]
    },
    {
        id: 'tomato-pasta',
        title: 'Паста с томатами и базиликом',
        emoji: '🍝', color: '#ffd6d0',
        categories: ['vegan', 'main'],
        time: 25, calories: 0, servings: 2,
        description: 'Лёгкая итальянская паста со свежим томатным соусом.',
        ingredients: [
            { name: 'спагетти', amount: 200, unit: 'г' },
            { name: 'помидоры', amount: 4, unit: 'шт' },
            { name: 'зубчики чеснока', amount: 2, unit: 'шт' },
            { name: 'оливковое масло', amount: 2, unit: 'ст. л.' },
            { name: 'базилик', amount: 10, unit: 'г' },
            { name: 'соль', amount: null }
        ],
        steps: [
            { text: 'Вскипятите воду, посолите и отварите спагетти 9 минут.', timer: 540 },
            { text: 'Нарежьте помидоры кубиками, чеснок мелко порубите.' },
            { text: 'Обжарьте чеснок в масле 1 минуту, добавьте помидоры и тушите 8 минут.', timer: 480 },
            { text: 'Смешайте пасту с соусом, добавьте листья базилика и подавайте.' }
        ]
    }
);

/* К каким приёмам пищи подходит блюдо */
const RECIPE_MEALS = {
    'oatmeal-banana': ['breakfast'],
    'syrniki': ['breakfast'],
    'pancakes': ['breakfast'],
    'omelet-veggies': ['breakfast', 'dinner'],
    'brownie': ['snack'],
    'sharlotka': ['snack'],
    'chia-mango': ['breakfast', 'snack'],
    'veg-ragout': ['lunch', 'dinner'],
    'hummus': ['snack', 'lunch'],
    'lentil-soup': ['lunch', 'dinner'],
    'carbonara': ['lunch', 'dinner'],
    'chicken-soup': ['lunch'],
    'avocado-toast': ['breakfast'],
    'chicken-rice': ['lunch', 'dinner'],
    'buckwheat-mushrooms': ['lunch', 'dinner'],
    'greek-salad': ['lunch', 'dinner'],
    'salmon-potato': ['dinner'],
    'tomato-pasta': ['lunch', 'dinner']
};

RECIPES.forEach(r => { r.meals = RECIPE_MEALS[r.id] || ['lunch', 'dinner']; });
