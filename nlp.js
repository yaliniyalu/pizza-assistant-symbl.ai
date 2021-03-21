class NLP {
    constructor(data) {
        this.nlp = data;

        this.intent = null;
        if (data['intents'][0]) {
            this.intent = data['intents'][0];
        }

        this.entities = data['entities'];

        // console.log(data)
    }

    getText() {
        return this.nlp.text;
    }

    getIntent() {
        return (this.intent ? this.intent['name'] : null);
    }

    hasIntent() {
        return (!!this.intent);
    }

    setIntent(name) {
        this.intent = { name: name };
    }

    isOrderIntent() {
        return this.getIntent() === 'order';
    }

    isItemAvailabilityCheckIntent() {
        return this.getIntent() === 'item_availability_check';
    }

    isMenuEnquiryIntent() {
        return this.getIntent() === 'menu_enquiry';
    }

    isPriceEnquiryIntent() {
        return this.getIntent() === 'price_enquiry';
    }

    isDeliveryIntent() {
        return this.getIntent() === 'delivery';
    }

    isCancelOrderIntent() {
        return this.getIntent() === 'cancel_order';
    }

    isFinishOrderIntent() {
        return this.getIntent() === 'finish_order';
    }

    getItems() {
        if (this.entities['item:item']) {
            return this.entities['item:item'];
        }
        return [];
    }

    getOptions() {
        if (this.entities['option:option']) {
            return this.entities['option:option'];
        }
        return [];
    }

    getSizes() {
        return this.getEntities('size:size');
    }

    getCrust() {
        return this.getEntities('crust:crust');
    }

    getToppings() {
        return this.getEntities('toppings:toppings');
    }

    getCheese() {
        return this.getEntities('cheese:cheese');
    }

    getNumber() {
        return this.getEntities('wit$number:number');
    }

    getAffirm() {
        return this.getEntities('affirm:affirm').shift();
    }

    getDesserts() {
        return this.getEntities('dessert:dessert');
    }

    getDrinks() {
        return this.getEntities('drink:drink');
    }

    getSalads() {
        return this.getEntities('salad:salad');
    }

    getSides() {
        return this.getEntities('side:side');
    }

    getActions() {
        return this.getEntities('action:action');
    }

    getAddresses() {
        return this.getEntities('address:address');
    }

    getEntities(name) {
        if (this.entities[name]) {
            return this.entities[name].reverse();
        }
        return [];
    }

    getAllItemNames() {
        let orders = [];
        orders = this.getDesserts().reduce((acc, v) => { acc.push(['dessert', v.value]);return acc;}, orders)
        orders = this.getSalads().reduce((acc, v) => { acc.push(['salad', v.value]);return acc;}, orders)
        orders = this.getDrinks().reduce((acc, v) => { acc.push(['drink', v.value]);return acc;}, orders)
        orders = this.getSides().reduce((acc, v) => { acc.push(['side', v.value]);return acc;}, orders)
        return orders;
    }

    getTraits() {

    }

    getTraitGreetings() {
        return this.nlp['traits']['wit$greetings']
    }
}

module.exports = NLP;
