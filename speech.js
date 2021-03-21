const sample = require('lodash.sample');

const speech = {
    POSITIVE: [
        'Yes', 'Yep', 'Yeah'
    ],
    NEGATIVE: [
        'No', 'Nope', 'Sorry'
    ],
    PREFIX_SORRY: [
        'Sorry, '
    ],
    PREFIX_OK: [
        'Ok, ', 'Got It, ', '', '', ''
    ],
    PREFIX_NOT_OK: [
        'Ok, ', 'Sorry, ', 'Hmm, ', '', '', ''
    ],
    PREFIX_FALLBACK: [
        'I didn\'t get it. ',
        'Can you rephrase it? ',
        'I Couldn\'t understand. ',
        'Sorry, ',
        'Sorry, ',
    ],
    INFORM_WELCOME: [
        '{greet}, Welcome to Pizza Shop. What can i do for you?',
        '{greet}, Welcome to Pizza Shop.',
        "{greet}, This is Pizza Shop. How can i help you?",
        '{greet}, Welcome to Pizza Shop. How can i help you?',
    ],
    INFORM_WELCOME_2: [
        'Hi, What can i do for you?',
        "Hello, How can i help you?",
    ],
    PROMPT_PIZZA_SIZE: [
        "What size?",
        "what size pizza can I get you?",
        "What size do you prefer?"
    ],
    PROMPT_PIZZA_CRUST: [
        "What type of crust do you prefer?",
        "What kind of crust do you like?",
        "on what kind of crust?"
    ],
    PROMPT_PIZZA_CRUST_LI: [
        "What type of crust do you prefer?",
        "What kind of crust do you like?"
    ],
    PROMPT_PIZZA_TOPPINGS: [
        "what toppings would you like?",
        "Do you need any toppings?"
    ],
    PROMPT_PIZZA_TOPPINGS_LI: [
        'what toppings would you like?'
    ],
    PROMPT_PIZZA_CHEESE: [
        "Any changes to the cheese?",
        "how do you like the cheese?",
        "What about cheese?"
    ],
    PROMPT_PIZZA_CHEESE_LI: [
        "how do you like the cheese?",
    ],
    PROMPT_PIZZA_ORDER_IS_CORRECT: [
        "Am i correct?",
        "Is it correct?"
    ],
    PROMPT_PIZZA_ORDER_CHANGES: [
        'What change do i have to make?',
        'What are the changes?'
    ],
    PROMPT_ANYTHING_ELSE: [
        'Anything else?',
        'Do you want anything else?',
        'Do you want any drinks, desserts or side salads?'
    ],
    PROMPT_TOP_LEVEL_MENU: [
        'We have drinks, desserts and sides'
    ],
    PROMPT_DELIVERY_ADDRESS: [
        'Where we have to deliver your order?',
        'What is your delivery address?',
        'Where can we deliver your order?',
    ],
    PROMPT_ORDER_IS_CORRECT: [
        "Am i correct?",
        "Is it correct?",
        "Can i finalize the order?",
        "Can i confirm the order?"
    ],
    PROMPT_CANCEL_ORDER: [
        "Do you want to cancel the order?",
        "Are you sure to cancel the order?",
        "Do you really want to start over?"
    ],

    INFORM_ITEM_AVAIL_YES: [
        'We have {item}.',
        '{item} is available.',
    ],
    INFORM_ITEM_AVAIL_NO: [
        "We don't have {item}.",
        '{item} is not available.'
    ],
    INFORM_ITEM_AVAIL_YES_WITH_CAT: [
        'We have {item} {category}.',
        '{item} {category} is available.',
    ],
    INFORM_ITEM_AVAIL_NO_WITH_CAT: [
        "We don't have {item} {category}.",
        '{item} {category} is not available.'
    ],
    INFORM_MENU_WITH_CAT: [
        'We have {items} {category}.',
        'We provide {items} {category}.'
    ],
    INFORM_MENU: [
        'We have {items}.',
        'The {category} we have are {items}.',
        '{items}.'
    ],
    INFORM_ITEM_AVAIL_FALLBACK: [
        "We don't have that."
    ],
    INFORM_ITEM_AVAIL_FALLBACK_WITH_CAT: [
        "We don't have that {category}."
    ],
    INFORM_ITEM_ADDED: [
        '{qty} {item} has been added to your order.',
        '{qty} {item} added.'
    ],
    INFORM_ITEM_REMOVED: [
        '{qty} {item} has been removed to your order.',
        '{qty} {item} removed.'
    ],
    INFORM_ITEM_ADDED_NO_QTY: [
        '{item} has been added to your order.',
        '{item} added.'
    ],
    INFORM_ITEM_REMOVED_NO_QTY: [
        '{item} has been removed from your order.',
        '{item} removed.'
    ],
    INFORM_ITEM_DELETED: [
        '{item} has been removed to your order.',
        '{item} removed.'
    ],
    INFORM_ITEM_PRICE: [
        '{item} costs {price} dollars.',
        "it's {price} dollars for {item}.",
        "for {item} it's {price} dollars.",
        "it's {price} dollars."
    ],
    INFORM_DELIVERY_ADDRESS_NOTED: [
        'Your delivery address has been noted.',
    ],
    INFORM_ORDER_CLEARED: [
        'Your order has been cleared.',
        'Ordered cleared.',
        "Ok let's start over."
    ],
    INFORM_ORDER_CONFIRMED: [
        'Your order has been confirmed. Your order no is {order}.',
        'Your order number {order} is confirmed.',
        "Order confirmed. Order number is {order}.",
        "Order confirmed. Your order number is {order}."
    ],
    PROMPT_ITEM_NAME_FOR_PRICE_ENQ: [
        'which {category}?',
        'you want price for which {category}?',
        'price for which {category}?'
    ],
}

function __sample(arr, ops = {}) {
    let text = sample(arr);
    const keys = Object.keys(ops);

    keys.forEach(v => {
        text = text.replace(`{${v}}`, ops[v])
    });

    return text;
}

function getSpeech(arr, ops = {}) {
    return __sample(arr, ops);
}

function getNegativeSpeech(arr, ops = {}) {
    return getSpeechWithPrefix(arr, speech.NEGATIVE, ops);
}

function getPositiveSpeech(arr, ops = {}) {
    return getSpeechWithPrefix(arr, speech.POSITIVE, ops);
}

function getSpeechWithPrefix(arr, prefix, ops = {}) {
    return mergeSpeech(sample(prefix), __sample(arr, ops));
}

function getSpeechWithOK(arr, ops = {}) {
    return getSpeechWithPrefix(arr, speech.PREFIX_OK, ops);
}

function getSpeechWithNotOK(arr, ops = {}) {
    return getSpeechWithPrefix(arr, speech.PREFIX_NOT_OK, ops);
}

function getSpeechWithFallback(arr) {
    return getSpeechWithPrefix(arr, speech.PREFIX_FALLBACK);
}

function mergeSpeech(...arr) {
    return arr.join(' ').trim();
}

module.exports = {
    speech,
    getSpeech,
    mergeSpeech,
    getSpeechWithOK,
    getSpeechWithNotOK,
    getSpeechWithFallback,
    getNegativeSpeech,
    getPositiveSpeech
}
