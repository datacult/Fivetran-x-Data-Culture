const fs = require('fs');
require('dotenv').config()
const JSONStream = require('JSONStream');
const chalk = require("chalk");

let settings = {
    type: "lambda",
    path: "../index.js",
    entry: "handler",
    test: false, // true will run a single call to the function. false will continue to call until hasMore == false
    secrets: {
        BASE_URL: process.env.BASE_URL,
    }
}

let stored_state = {}


const sync = async (func, state=stored_state, secrets=settings.secrets) => {

    if (settings.type == 'lambda'){

        let res = await func(
            {
                state: state,
                secrets: secrets
            },
            null,
            (error, response) => {

                if (response.state != stored_state){
                    console.log('state updated to: ', state)
                }

                for (key in response.insert){
                    console.log(`${response.insert[key].length} records received to insert into ${key} table.`)
                }

                if(response.hasMore == true){
                    sync(func, response.state)
                }

                if (error) console.log(error)
            }
        )
    } else {
        console.log('function type not supported')
    }

}



const test = async (func, state=stored_state, secrets=settings.secrets) => {

    if (settings.type == 'lambda'){

        let res = await func(
            {
                state: state,
                secrets: secrets
            },
            null,
            (error, response) => {
                console.log(response)
                if (error) console.log(error)
            }
        )
    } else {
        console.log('function type not supported')
    }

}

function run(overrides) {

    settings = { ...settings, ...overrides }

    const func = require(settings.path)

    if (settings.test == true) {
        test(func[settings.entry])
    } else {
        sync(func[settings.entry])
    }

}

run()