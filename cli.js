const chalk = require('chalk');
const Agent = require('./agent');
require('dotenv').config()

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
})

const agent = new Agent(1230);

agent.init().then(() => {
    run();
})

let talks = {
    '/1': 'i want to order pizza',
    '/2': ''
}

let conversation = {
    'order_pizza': [
        'i want to order pizza',
        'Do you have large pizza?',
        'large',
        'What options do you have?',
        'regular',
        'no',
        'yes',
        'ham, mushroom and tomatoes',
        'yes'
    ],
    'order_pizza_2': [
        'i want to order 2 small pizza with extra cheese',
        'regular',
        'ham, mushroom and tomatoes',
        'no',
        'i want light cheese',
        'yes'
    ],
    'order_pizza_3': [
        '2 small pizza with normal cheese, gluten free crust and ham and mushroom toppings',
        'yes'
    ],
    'order_4': [
        'order pizza',
        'what pizzas do you have',
        'what is the price',
        'large',
        'what is the cost of small pizza?',
        'large',
        'regular'
    ],
    'avail_check_1': [
        'Do you have large pizza?',
        'Is regular crust available',
        'Do you provide ham toppings',
        'Is there coke',
        'Do you have normal cheese',
        'Do you have large caesar salad',
        'Do you have truffle brownies',
    ],
    'avail_check_2': [
        'What sizes are available',
        'What options i have in pizza',
        'What are the drinks you have',
        'What options i have on salads',
        'What desserts you have',
        'Options i have in cheese',
        'Options in crusts',
        'What you have on toppings'
    ],
    'avail_check_3': [
        'Do you have flat pizza',
        'Is flat crust available',
        'Do you have beer',
        'What chocolates are available'
    ],
    'order_other_1': [
        'Add 1 coke',
        'I want 2 pepsi and 1 truffle brownie',
        'Do you have coke',
        'Add 5'
    ],
    'item_price': [
        'What is the price of coke',
        'Do you have coke',
        'what is the price of it?',
        'What is the price of large pizza?',
        'what is the prize of pizza?',
        'large',
        'what is the price of drinks?',
        'coke'
    ],
    'order_5': [
        '2 small pizza with normal cheese, gluten free crust and ham and mushroom toppings',
        'yes',
        'what drinks do you have?',
        'add 1 coke',
    ],
    'order_6': [
        '2 small pizza with normal cheese, gluten free crust and ham and mushroom toppings',
        'yes',
        'yes',
        'add 1 coke',
        "that's all",
        'marthandam',
        'yes'
    ],
    'order_7': [
        '2 small pizza with normal cheese, gluten free crust and ham and mushroom toppings',
        'yes',
        'no',
        'marthandam',
        'no',
        'add 2 cokes',
        'start over',
        'yes'
    ],
    'hello': [
        'hello'
    ],
    'fallback': [
        '2 small pizza with normal cheese',
        'its funny',
        'gluten free'
    ],
    'demo': [
        'Hello, i want to order 2 small pizza with extra cheese',
        'regular',
        'what toppings do you provide',
        'ok, tomato and ham',
        'yes',
        'Do you have pepsi',
        'what is the price?',
        'Then add 2',
        'Do you have any desserts',
        'one truffle brownie',
        "Ok that's all",
        'dubai kurukuchanthu, dubai main road, dubai',
        'yes'
    ]
}

let auto_con = 'demo';
let auto_con_index = 0;

async function run() {
    let output = agent.makeWelcome();

    while (auto_con) {
        let input = conversation[auto_con][auto_con_index ++];
        if (!input) {
            auto_con = null;
            break;
        }

        console.log(chalk.blue(output));
        console.log('-> ' + input);
        output = await agent.process(input);
        await agent.save();
    }

    console.log(chalk.blue(output))
    console.log(chalk.green('End Of Conversation'))

    process.exit(0);

    while (output) {
        let input = await displayOutput(output);

        if (input.startsWith('/')) {
            input = talks[input];
            console.log(input)
        }

        if (input === 'exit') {
            output = null;
            return;
        }

        output = await agent.process(input);
        await agent.save();
    }
    readline.close();
}


async function displayOutput(text) {
    return new Promise((resolve) => {
        readline.question(chalk.blue("\n" + text + "\n"), (answer) => {
            resolve(answer);
        })
    })
}

readline.on("close", function() {
    console.log(chalk.red("\nConversation Interrupted"));
    process.exit(0);
});
