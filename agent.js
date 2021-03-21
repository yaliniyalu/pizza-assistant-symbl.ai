const {Wit} = require('node-wit');
const NLP = require('./nlp')

const { speech, getSpeech, mergeSpeech, getSpeechWithOK, getSpeechWithNotOK, getSpeechWithFallback, getPositiveSpeech, getNegativeSpeech } = require('./speech')
const { getDesserts, getSalads, getDrinks, getSides, getItems, makeSpeakableList } = require('./menu');
const { getSaladCost, getDessertCost, getDrinkCost, getSideCost, getPizzaCost } = require('./menu');
const { getSizes, getCheeses, getCrusts, getToppings } = require("./menu");

const states = {
    PROMPTED_FOR_DAILY_SPECIALS: 'PROMPTED_FOR_DAILY_SPECIALS',
    PROMPTED_TO_ORDER_DAILY_SPECIAL: 'PROMPTED_TO_ORDER_DAILY_SPECIAL',
    PROMPTED_TO_CUSTOMIZE : 'PROMPTED_TO_CUSTOMIZE',
    PROMPTED_TO_ADD_TO_ORDER: 'PROMPTED_TO_ADD_TO_ORDER',
    PROMPTED_TO_ORDER_SPECIAL : 'PROMPTED_TO_ORDER_SPECIAL',
    PROMPTED_TO_CUSTOMIZE_SPECIAL_PIZZA : 'PROMPTED_TO_CUSTOMIZE_SPECIAL_PIZZA',

    PROMPTED_PIZZA_SIZE: 'PROMPTED_PIZZA_SIZE',
    PROMPTED_PIZZA_CRUST: 'PROMPTED_PIZZA_CRUST',
    PROMPTED_PIZZA_CHEESE: 'PROMPTED_PIZZA_CHEESE',
    PROMPTED_PIZZA_TOPPINGS: 'PROMPTED_PIZZA_TOPPINGS',

    PROMPTED_PIZZA_ORDER_IS_CORRECT: 'PROMPTED_PIZZA_ORDER_IS_CORRECT',
    PROMPTED_PIZZA_ORDER_CHANGE: 'PROMPTED_PIZZA_ORDER_CHANGE',

    PROMPTED_ANYTHING_ELSE: 'PROMPTED_ANYTHING_ELSE',

    PROMPTED_ITEM_NAME: 'PROMPTED_ITEM_NAME',
    PROMPTED_DELIVERY_ADDRESS: 'PROMPTED_DELIVERY_ADDRESS',
    PROMPTED_ORDER_IS_CORRECT: 'PROMPTED_ORDER_IS_CORRECT',
    PROMPTED_CANCEL_ORDER: 'PROMPTED_CANCEL_ORDER'
};

const getDefaultContext = () => {
    return {
        order: {
            pizza: [],
            dessert: {},
            drink: {},
            salad: {},
            side: {}
        },
        item: {
            name: null,
            type: null
        },
        stateProp: {

        },
        delivery_address: null,
        orderNo: null
    }
}

class Pizza {
    constructor() {
        this.size = null;
        this.crust = null;
        this.cheese = null;
        this.toppings = null;
        this.qty = 0;

        this.defaultCheese = 'normal';
        this.defaultCrust = 'regular';
        this.defaultToppings = [];

        this.confirm = false;
    }

    isComplete() {
        return this.size && this.crust && this.cheese && this.toppings !== null;
    }

    isConfirm() {
        return this.confirm;
    }

    getOrderText() {
        let text;
        if (this.toppings.length) {
            text = `${this.size} pizza with ${this.cheese} cheese, ${this.crust} crust and ${makeSpeakableList(this.toppings)} toppings.`
        } else {
            text = `${this.size} pizza with ${this.cheese} cheese and ${this.crust} crust.`
        }

        if (this.qty === 1) {
            text = 'a ' + text;
        } else {
            text = this.qty + ' ' + text;
        }

        return text;
    }

    getTotalCost() {
        return getPizzaCost(this.size);
    }
}

class Agent {
    constructor(id) {
        this.id = id;
        this.states = [];
        this.context = getDefaultContext();
        this.endCall = false;
        this.markForFinish = false;
        this.silentCounter = 0;

        this.sms = null;
    }

    async init() {
        // this.context = await session.get('context_' + this.id)
    }

    async save() {

    }

    async analyseNaturalLanguage(text) {
        const client = new Wit({
            accessToken: process.env.WIT_CLIENT_ACCESS_TOKEN,
        });

        const data = await client.message(text);
        return new NLP(data);
    }

    hangUp() {
        this.endCall = true;
    }

    canHangUp() {
        return this.endCall;
    }

    getCurrentPizza() {
        return this.context.order.pizza[this.context.order.pizza.length - 1];
    }

    askAnyThingElse() {
        this.states.push(states.PROMPTED_ANYTHING_ELSE);
        return getSpeechWithOK(speech.PROMPT_ANYTHING_ELSE);
    }

    takePizzaOrder(pizza) {
        let state, prompt;

        if (!pizza.size) {
            state = states.PROMPTED_PIZZA_SIZE;
            prompt = speech.PROMPT_PIZZA_SIZE;
        }
        else if (!pizza.crust) {
            state = states.PROMPTED_PIZZA_CRUST;
            prompt = speech.PROMPT_PIZZA_CRUST;
        }
        else if (!pizza.cheese) {
            state = states.PROMPTED_PIZZA_CHEESE;
            prompt = speech.PROMPT_PIZZA_CHEESE;
        }
        else if (!pizza.toppings) {
            state = states.PROMPTED_PIZZA_TOPPINGS;
            prompt = speech.PROMPT_PIZZA_TOPPINGS;
        }

        if (state) {
            this.states.push(state);
            return getSpeechWithOK(prompt);
        }

        let speech_1 = pizza.getOrderText();
        let speech_2 = getSpeech(speech.PROMPT_PIZZA_ORDER_IS_CORRECT);

        this.states.push(states.PROMPTED_PIZZA_ORDER_IS_CORRECT);
        return mergeSpeech(speech_1, speech_2);
    }

    async saveOrder() {
        const fs = require('fs');

        const file_name = `./orders/order_${this.id}.json`;
        let orderId = 1;

        let orders = {};
        if (fs.existsSync(file_name)) {
            const raw = fs.readFileSync(file_name);
            orders = JSON.parse(raw);

            orderId = Object.keys(orders).length + 1;
        }

        orders[orderId] = this.context.order;
        this.context.orderNo = orderId;

        fs.writeFileSync(file_name, JSON.stringify(orders));
    }

    async clearOrder() {
        this.context.order = getDefaultContext();
        this.states = [];
    }

    sendConfirmationSMS() {
        this.sms = this.informOrderSummary();
        this.sms += "\nThank you for choosing us.";
        this.sms += "\n\nDO NOT expect pizza to be delivered. This is demo application. Thanks for understanding.";
    }

    async informOrderSummary() {
        const order = this.context.order;
        let text = 'You have ';
        let totalPrize = 0;

        if (order.pizza.length) {
            let t = [];
            order.pizza.forEach(v => {
                t.push(v.getOrderText());
                totalPrize += v.getTotalCost();
            });

            text += makeSpeakableList(t);
            text += " ";
        }

        let desertsKeys = Object.keys(order.dessert);
        desertsKeys.forEach(v => {
            const qty = order.dessert[v];
            const cost = getDessertCost(v);
            const price = (cost * qty).toFixed(2);

            text += `${qty} ${v} for ${price} dollars. `
        })

        let drinksKeys = Object.keys(order.drink);
        drinksKeys.forEach(v => {
            const qty = order.drink[v];
            const cost = getDrinkCost(v);
            const price = (cost * qty).toFixed(2);

            text += `${qty} ${v} for ${price} dollars. `
        })

        let saladKeys = Object.keys(order.salad);
        saladKeys.forEach(v => {
            const qty = order.salad[v];
            const cost = getSaladCost(v);
            const price = (cost * qty).toFixed(2);

            text += `${qty} ${v} for ${price} dollars. `
        })

        let sidesKeys = Object.keys(order.side);
        sidesKeys.forEach(v => {
            const qty = order.side[v];
            const cost = getSideCost(v);
            const price = (cost * qty).toFixed(2);

            text += `${qty} ${v} for ${price} dollars. `
        })

        if (this.context.delivery_address) {
            text += `And your order will be delivered to ${this.context.delivery_address}.`
        }

        if (this.context.orderNo) {
            text += `Your order number is ${this.context.orderNo}`
        }

        return text;
    }

    async promptOrderSummary() {
        this.states.push(states.PROMPTED_ORDER_IS_CORRECT);
        return mergeSpeech(await this.informOrderSummary(), getSpeech(speech.PROMPT_ORDER_IS_CORRECT));
    }

    async proceedFinishOrder() {
        this.markForFinish = true;
        if (this.context.delivery_address) {
            return this.promptOrderSummary()
        } else {
            this.states.push(states.PROMPTED_DELIVERY_ADDRESS);
            return getSpeechWithOK(speech.PROMPT_DELIVERY_ADDRESS);
        }
    }

    async processState(state, nlp) {
        let affirm = nlp.getAffirm();
        const pizza = this.getCurrentPizza();

        switch (state) {
            case states.PROMPTED_PIZZA_SIZE:
                let size = nlp.getSizes()[0];
                if (size) {
                    pizza.size = size.value;
                    nlp.getSizes().shift();
                    return this.takePizzaOrder(pizza);
                }
                break;

            case states.PROMPTED_PIZZA_CRUST:
                let crust = nlp.getCrust()[0];
                if (crust) {
                    pizza.crust = crust.value;
                    nlp.getCrust().shift();
                    return this.takePizzaOrder(pizza);
                } else {
                    if (affirm && affirm.value === 'no') {
                        pizza.crust = pizza.defaultCrust;
                        return this.takePizzaOrder(pizza);
                    } else if (affirm && affirm.value === 'yes') {
                        this.states.push(states.PROMPTED_PIZZA_CRUST)
                        return getSpeech(speech.PROMPT_PIZZA_CRUST_LI);
                    }
                }
                break;

            case states.PROMPTED_PIZZA_CHEESE:
                let cheese = nlp.getCheese()[0];
                if (cheese) {
                    pizza.cheese = cheese.value;
                    nlp.getCheese().shift();
                    return this.takePizzaOrder(pizza);
                } else {
                    if (affirm && affirm.value === 'no') {
                        pizza.cheese = pizza.defaultCheese;
                        return this.takePizzaOrder(pizza);
                    } else if (affirm && affirm.value === 'yes') {
                        this.states.push(states.PROMPTED_PIZZA_CHEESE)
                        return getSpeech(speech.PROMPT_PIZZA_CHEESE_LI);
                    }
                }
                break;

            case states.PROMPTED_PIZZA_TOPPINGS:
                let toppings = nlp.getToppings();
                if (toppings.length) {
                    pizza.toppings = toppings.reduce((acc, v) => { acc.push(v.value); return acc; }, []);
                    return this.takePizzaOrder(pizza);
                } else {
                    if (affirm && affirm.value === 'no') {
                        pizza.toppings = pizza.defaultToppings;
                        return this.takePizzaOrder(pizza);
                    } else if (affirm && affirm.value === 'yes') {
                        this.states.push(states.PROMPTED_PIZZA_TOPPINGS)
                        return getSpeech(speech.PROMPT_PIZZA_TOPPINGS_LI);
                    }
                }
                break;

            case states.PROMPTED_PIZZA_ORDER_IS_CORRECT:
                if (affirm && affirm.value === 'no') {
                    pizza.confirm = false;

                    let speech_1 = getSpeech(speech.PREFIX_NOT_OK);
                    let speech_2 = getSpeech(speech.PROMPT_PIZZA_ORDER_CHANGES);
                    this.states.push(states.PROMPTED_PIZZA_ORDER_CHANGE)

                    return mergeSpeech(speech_1, speech_2);
                } else if (affirm && affirm.value === 'yes') {
                    pizza.confirm = true;
                    return this.askAnyThingElse();
                }
                break;

            case states.PROMPTED_PIZZA_ORDER_CHANGE:
                let size_2 = nlp.getSizes().shift();
                let crust_2 = nlp.getCrust().shift();
                let cheese_2 = nlp.getCheese().shift();
                let toppings_2 = nlp.getToppings();
                let qty_2 = nlp.getNumber().shift();

                if (size_2) pizza.size = size_2.value;
                if (crust_2) pizza.crust = crust_2.value;
                if (cheese_2) pizza.cheese = cheese_2.value;
                if (toppings_2.length) pizza.toppings = toppings_2.reduce((acc, v) => { acc.push(v.value); return acc; }, []);
                if (qty_2) pizza.qty = qty_2.value;

                if (size_2 || crust_2 || cheese_2 || toppings_2.length || qty_2) {
                    return this.takePizzaOrder(pizza);
                }
                break;

            case states.PROMPTED_ITEM_NAME:
                if (!nlp.hasIntent()) {
                    nlp.setIntent('price_enquiry');
                    return true;
                }
                break;

            case states.PROMPTED_ANYTHING_ELSE:
                if (!nlp.hasIntent()) {
                    if (affirm && affirm.value === 'yes') {
                        return getSpeech(speech.PROMPT_TOP_LEVEL_MENU);
                    } else if (affirm && affirm.value === 'no') {
                        return await this.proceedFinishOrder();
                    }
                }
                break;

            case states.PROMPTED_DELIVERY_ADDRESS:
                if (!nlp.hasIntent() || nlp.isDeliveryIntent()) {
                    let address = '';
                    if (nlp.getAddresses()[0]) {
                        address = nlp.getAddresses()[0].value;
                    } else {
                        address = nlp.getText();
                    }

                    this.context.delivery_address = address;

                    if (this.markForFinish) {
                        return this.promptOrderSummary(nlp)
                    } else {
                        return getSpeechWithOK(speech.INFORM_DELIVERY_ADDRESS_NOTED);
                    }
                }
                break;

            case states.PROMPTED_ORDER_IS_CORRECT:
                if (affirm) {
                    if (affirm.value === 'no') {
                        return "What is the change?"
                    } else {
                        await this.saveOrder();
                        this.hangUp();
                        this.sendConfirmationSMS();
                        return mergeSpeech(getSpeech(speech.INFORM_ORDER_CONFIRMED, {order: this.context.orderNo}), this.makeThankYou());
                    }
                } else {
                    this.states.push(states.PROMPTED_ORDER_IS_CORRECT);
                    return getSpeechWithFallback(speech.PROMPT_PIZZA_ORDER_IS_CORRECT)
                }

            case states.PROMPTED_CANCEL_ORDER:
                if (affirm) {
                    if (affirm.value === 'no') {
                        return "Ok."
                    } else {
                        await this.clearOrder();
                        return getSpeechWithOK(speech.INFORM_ORDER_CLEARED)
                    }
                }
                break;
        }

        return false;
    }

    getFallbackStateText(state) {
        switch (state) {
            case states.PROMPTED_PIZZA_SIZE:
                return speech.PROMPT_PIZZA_SIZE;

            case states.PROMPTED_PIZZA_CRUST:
                return speech.PROMPT_PIZZA_CRUST_LI;

            case states.PROMPTED_PIZZA_CHEESE:
                return speech.PROMPT_PIZZA_CHEESE_LI;

            case states.PROMPTED_PIZZA_TOPPINGS:
                return speech.PROMPT_PIZZA_TOPPINGS_LI;

            case states.PROMPTED_PIZZA_ORDER_IS_CORRECT:
                return speech.PROMPT_PIZZA_ORDER_IS_CORRECT;

            case states.PROMPTED_PIZZA_ORDER_CHANGE:
                return speech.PROMPT_PIZZA_ORDER_CHANGES;

            case states.PROMPTED_ITEM_NAME:
                return speech.PROMPT_ITEM_NAME_FOR_PRICE_ENQ;

            case states.PROMPTED_ANYTHING_ELSE:
                return speech.PROMPT_ANYTHING_ELSE;

            case states.PROMPTED_DELIVERY_ADDRESS:
                return speech.PROMPT_DELIVERY_ADDRESS;

            case states.PROMPTED_ORDER_IS_CORRECT:
                return speech.PROMPT_ORDER_IS_CORRECT;

            case states.PROMPTED_CANCEL_ORDER:
                return speech.PROMPT_CANCEL_ORDER;
        }
        return null;
    }

    async processFallbackState(state, nlp) {
        const speech = this.getFallbackStateText(state);
        if (!speech) {
            return false;
        }
        return getSpeechWithFallback(speech);
    }

    silentFallback() {
        this.silentCounter ++;

        if (this.silentCounter >= 2) {
            this.hangUp();
            return null;
        }

        if (this.states.length) {
            const state = this.states[this.states.length - 1];
            const text = this.getFallbackStateText(state);

            if (!text) {
                return 'Hello, Are You there?'
            }

            return mergeSpeech('Hello, ', getSpeech(text))
        }

        return 'Hello, Are You there?';
    }

    async process(text) {
        this.endCall = false;
        this.silentCounter = 0;
        this.sms = null;

        const nlp = await this.analyseNaturalLanguage(text);

        let res = await this.processStateLess(nlp);
        if (res !== false) {
            return res;
        }

        let state = this.states.pop();
        if (state) {
            let res = await this.processState(state, nlp);
            if (res !== true && res !== false) {
                return res;
            }

            if (res === false) {
                this.states.push(state);
            }
        }

        res = this.processPriceEnquiryIntent(nlp);
        if (res) return res;

        if (nlp.isOrderIntent()) {
            const items = nlp.getItems();

            if (items.length <= 0) {
                items.push({name: 'pizza'});
            }

            let sizes = nlp.getSizes();
            let crusts = nlp.getCrust();
            let cheeses = nlp.getCheese();
            let toppings = nlp.getToppings();
            let numbers = nlp.getNumber();
            let actions = nlp.getActions();

            let lastOutput = null;
            items.forEach((v, key) => {
                switch (v.value) {
                    case 'pizza':
                        if (this.context.order.pizza.length) {
                            const pizza = this.getCurrentPizza();
                            if (pizza.isConfirm()) {
                                const pizza = new Pizza();
                                pizza.qty = 1;
                                this.context.order.pizza.push(pizza);
                            }
                        } else {
                            const pizza = new Pizza();
                            pizza.qty = 1;
                            this.context.order.pizza.push(pizza);
                        }

                        const pizza = this.getCurrentPizza();

                        let size = sizes.shift();
                        let crust = crusts.shift();
                        let cheese = cheeses.shift();
                        let qty = numbers.shift();

                        if (size) pizza.size = size.value;
                        if (crust) pizza.crust = crust.value;
                        if (cheese) pizza.cheese = cheese.value;
                        if (toppings.length) pizza.toppings = toppings.reduce((acc, v) => { acc.push(v.value); return acc; }, []);
                        if (qty) pizza.qty = qty.value;

                        lastOutput = this.takePizzaOrder(pizza);
                        break;
                }
            })

            let orders = nlp.getAllItemNames();

            let quantities = numbers.reduce((acc, v) => { acc.push(v.value); return acc; }, [])
            actions = actions.reduce((acc, v) => { acc.push(v.value); return acc; }, [])

            if (!orders.length && this.context.item.name) {
                orders.push([this.context.item.type, this.context.item.name])
            }

            let responses = {
                'added' : [],
                'removed': []
            };

            orders.forEach((v, k) => {
                const type = v[0];
                const name = v[1];
                const quantity = quantities[k] ? quantities[k] :  1;
                const action = actions[k] ? actions[k] : 'add';

                if (action === 'add') {
                    if (this.context.order[type][name]) {
                        this.context.order[type][name] += quantity;
                    } else {
                        this.context.order[type][name] = quantity;
                    }

                    responses['added'].push({ qty: quantity, item: name });
                } else {
                    if (this.context.order[type][name]) {
                        if (!quantities[k]) {
                            delete this.context.order[type][name];
                            responses['removed'].push({ qty: quantity, item: name });
                        } else {
                            this.context.order[type][name] -= quantity;
                            if (this.context.order[type][name] <= 0) {
                                delete this.context.order[type][name];
                            }
                            responses['removed'].push({ qty: quantity, item: name });
                        }
                    }
                }
            })

            if (lastOutput) {
                return lastOutput;
            }

            let speeches = [];
            if (responses.added.length || responses.removed.length) {
                const names_add = responses.added.reduce((acc, v) => {
                    acc.push(v['qty'] + ' ' + v['item']);
                    return acc;
                }, [])

                const names_rem = responses.removed.reduce((acc, v) => {
                    acc.push(v['qty'] + ' ' + v['item']);
                    return acc;
                }, [])

                if (names_add.length)
                    speeches.push(getSpeech(speech.INFORM_ITEM_ADDED_NO_QTY, { item: makeSpeakableList(names_add) }))

                if (names_rem.length)
                    speeches.push(getSpeech(speech.INFORM_ITEM_REMOVED_NO_QTY, { item: makeSpeakableList(names_rem) }))

                return speeches.join(', ')
            }

            return getNegativeSpeech(speech.INFORM_ITEM_AVAIL_FALLBACK);
        }

        if (nlp.isFinishOrderIntent()) {
            return await this.proceedFinishOrder();
        }

        if (nlp.isCancelOrderIntent()) {
            this.states.push(states.PROMPTED_CANCEL_ORDER);
            return getSpeech(speech.PROMPT_CANCEL_ORDER);
        }

        let greet = nlp.getTraitGreetings();
        if (greet) {
            if (!this.states.length) {
                return getSpeech(speech.INFORM_WELCOME_2);
            } else {
                return null;
            }
        }

        if (this.states.length) {
            const state = this.states[this.states.length - 1];
            const res = await this.processFallbackState(state, nlp);
            if (res !== false) {
                return res;
            }
        }

        return getSpeech(speech.PREFIX_FALLBACK);
    }

    setContextItem(name, type) {
        this.context.item = {
            name: name,
            type: type
        }
    }

    async processStateLess(nlp) {
        if (nlp.isItemAvailabilityCheckIntent() ||  nlp.isMenuEnquiryIntent()) {
            const checkAvailability = (getFn, listFn, cat) => {
                let item = getFn[0];
                if (item) {
                    getFn.shift();
                    item = item.value;
                    if (listFn.includes(item.toLowerCase())) {
                        this.setContextItem(item, cat);
                        return getPositiveSpeech(speech.INFORM_ITEM_AVAIL_YES, {item: item})
                    } else {
                        return getNegativeSpeech(speech.INFORM_ITEM_AVAIL_NO, {item: item})
                    }
                }
                return false;
            }

            const checkAvailabilityCat = (getFn, listFn, cat) => {
                let item = getFn[0];
                if (item) {
                    getFn.shift();
                    item = item.value;
                    if (listFn.includes(item.toLowerCase())) {
                        this.setContextItem(item, cat);
                        return getPositiveSpeech(speech.INFORM_ITEM_AVAIL_YES_WITH_CAT, {item: item, category: cat})
                    } else {
                        return getNegativeSpeech(speech.INFORM_ITEM_AVAIL_NO_WITH_CAT, {item: item, category: cat})
                    }
                }
                return false;
            }

            let res;

            if (nlp.isItemAvailabilityCheckIntent()) {
                res = checkAvailability(nlp.getDesserts(), getDesserts(), 'dessert');
                if (res !== false) return res;

                res = checkAvailability(nlp.getDrinks(), getDrinks(), 'drink');
                if (res !== false) return res;

                res = checkAvailability(nlp.getSalads(), getSalads(), 'salad');
                if (res !== false) return res;

                res = checkAvailabilityCat(nlp.getSizes(), getSizes(), 'pizza');
                if (res !== false) return res;

                res = checkAvailabilityCat(nlp.getCrust(), getCrusts(), 'crust');
                if (res !== false) return res;

                res = checkAvailabilityCat(nlp.getCheese(), getCheeses(), 'cheese');
                if (res !== false) return res;

                res = checkAvailabilityCat(nlp.getToppings(), getToppings(), 'toppings');
                if (res !== false) return res;
            }

            let speechFn = getSpeech
            if (nlp.isItemAvailabilityCheckIntent()) {
                speechFn = getSpeechWithOK
            }

            let item = nlp.getItems()[0];
            let option = nlp.getOptions()[0];

            if (!option && !item) {
                let state = this.states[0];
                let pred = null;
                switch (state) {
                    case states.PROMPTED_PIZZA_SIZE:
                        pred = 'size';
                        break;
                    case states.PROMPTED_PIZZA_CHEESE:
                        pred = 'cheeses';
                        break;
                    case states.PROMPTED_PIZZA_CRUST:
                        pred = 'crusts';
                        break;
                    case states.PROMPTED_PIZZA_TOPPINGS:
                        pred = 'topping';
                        break;
                }

                if (pred) {
                    option = {value: pred};
                }
            }

            if (item) {
                item = item.value;
                switch (item) {
                    case 'pizza':
                        const sizes = getSizes();
                        return speechFn(speech.INFORM_MENU_WITH_CAT, { items: makeSpeakableList(sizes), category: 'pizzas'});

                    case 'side':
                        const sides = getSides();
                        return speechFn(speech.INFORM_MENU, { items: makeSpeakableList(sides), category: 'sides' })

                    case 'dessert':
                        const desserts = getDesserts();
                        return speechFn(speech.INFORM_MENU, { items: makeSpeakableList(desserts), category: 'desserts' })

                    case 'drinks':
                        const drinks = getDrinks();
                        return speechFn(speech.INFORM_MENU, { items: makeSpeakableList(drinks), category: 'drinks' })

                    case 'salad':
                        const salads = getSalads();
                        return speechFn(speech.INFORM_MENU, { items: makeSpeakableList(salads), category: 'salads' })
                }
            }


            if (option) {
                option = option.value;
                switch (option) {
                    case 'size':
                        const sizes = getSizes();
                        return speechFn(speech.INFORM_MENU_WITH_CAT, { items: makeSpeakableList(sizes), category: 'pizzas'});
                    case 'crusts':
                        const crusts = getCrusts();
                        return speechFn(speech.INFORM_MENU_WITH_CAT, { items: makeSpeakableList(crusts), category: 'crusts'});
                    case 'cheeses':
                        const cheeses = getCheeses();
                        return speechFn(speech.INFORM_MENU_WITH_CAT, { items: makeSpeakableList(cheeses), category: 'cheeses'});
                    case 'topping':
                        const toppings = getToppings();
                        return speechFn(speech.INFORM_MENU_WITH_CAT, { items: makeSpeakableList(toppings), category: 'toppings'});
                }
            }

            if (item) {
                return getNegativeSpeech(speech.INFORM_ITEM_AVAIL_FALLBACK_WITH_CAT, {category: item.value})
            } else if (option) {
                return getNegativeSpeech(speech.INFORM_ITEM_AVAIL_FALLBACK_WITH_CAT, {category: option.value})
            } else {
                return getNegativeSpeech(speech.INFORM_ITEM_AVAIL_FALLBACK)
            }
        }

        let res = this.processPriceEnquiryIntent(nlp);
        if (res) return res;

        return false;
    }

    processPriceEnquiryIntent(nlp) {
        if (nlp.isPriceEnquiryIntent()) {
            const checkPrice = (item, listFn, cat) => {
                if (listFn[0]().includes(item.toLowerCase())) {
                    this.setContextItem(item, cat);
                    return getSpeech(speech.INFORM_ITEM_PRICE, {item: item, price: listFn[1](item)})
                }
                return false;
            }


            let orders = nlp.getAllItemNames();
            let size = nlp.getSizes()[0];
            let item = nlp.getItems()[0];

            if (!(orders.length || size)) {
                if (!orders.length && this.context.item.name) {
                    orders.push([this.context.item.type, this.context.item.name])
                }

                if (!orders.length && this.states.length && this.states[this.states.length - 1].startsWith('PROMPTED_PIZZA')) {
                    item = {value: 'pizza'};
                }
            }

            const mapping = {
                dessert: [getDesserts, getDessertCost],
                drink: [getDrinks, getDrinkCost],
                salad: [getSalads, getSaladCost],
                side: [getSides, getSideCost],
            }

            if (orders[0] && orders[0][0] !== 'pizza') {
                let res = checkPrice(orders[0][1], mapping[orders[0][0]], orders[0][0]);
                if (res !== false) return res;
            }

            if (size) {
                size = size.value;
                if (getSizes().includes(size.toLowerCase())) {
                    this.setContextItem(size, 'pizza');
                    return getSpeech(speech.INFORM_ITEM_PRICE, {item: size + ' pizza', price: getPizzaCost(size)})
                }
            }

            if (item) {
                this.context.stateProp[states.PROMPTED_ITEM_NAME] = item.value;
                this.states.push(states.PROMPTED_ITEM_NAME);
                return getSpeechWithNotOK(speech.PROMPT_ITEM_NAME_FOR_PRICE_ENQ, {category: item.value})
            }
        }
    }

    makeWelcome() {
        return getSpeech(speech.INFORM_WELCOME, { greet: (new Date().getHours() > 12) ? "Good Afternoon!" : "Good Morning!" });
    }

    makeThankYou() {
        let hours = (new Date().getHours() > 12) ? "Good Afternoon!" : "Good Morning!"

        let speeches;
        if (hours > 20) {
            speeches = [
                'Good Night!',
                'Have a nice dinner!'
            ];
        } else if (hours > 15) {
            speeches = [
                'Have a nice day!'
            ];
        } else if (hours > 11) {
            speeches = [
                'Have a nice day!',
                'Have a nice lunch!'
            ];
        } else {
            speeches = [
                'Have a nice day!'
            ];
        }

        const speech_1 = getSpeech(["Thank you for visiting us!", "Thank you for choosing us!", "Thank you for shopping with us!"]);
        const speech_2 = getSpeech(speeches);
        const speech_3 = getSpeech(['Bye', '', '']);

        return mergeSpeech(speech_1, speech_2, speech_3)
    }
}

module.exports = Agent;
