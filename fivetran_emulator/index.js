const fs = require('fs');
require('dotenv').config()
const JSONStream = require('JSONStream');
const chalk = require("chalk");

/*
--- EMULATOR SETTINGS ---
*/
let settings = {
    type: "lambda", // lambda or GCF (GCF not yet implemented)
    path: "../index.js", // filepath of custom function
    entry: "handler", // entry point to the custom function
    test: false, // true will run a single call to the function. false will continue to call until hasMore == false
    save: false, // save a local file of the results once sync has finished
    secrets: {
        BASE_URL: process.env.BASE_URL, // add any environment variables here to be loaded in from .env file
    }
}

/*
--- CONTINUOUS SYNC ---
Will persistently call custom function until hasMore: false is received. 
*/
const sync = async (func, state = {}, secrets = settings.secrets, data={}) => {

    if (settings.type == 'lambda') {

        let res = await func(
            {
                state: state,
                secrets: secrets
            },
            null,
            (error, response) => {

                if (Object.values(response.state) != Object.values(state)) {
                    console.log(chalk.blue('state updated to: '), response.state)
                }

                for (key in response.insert) {
                    console.log(chalk.blue(`${response.insert[key].length} records received to insert into ${key} table.`))
                    if (!data.hasOwnProperty(key)) data[key] = []
                    data[key] = [...data[key], ...response.insert[key]]
                }

                if (response.hasMore == true) {
                    sync(func, response.state, settings.secrets, data)
                } else {
                    console.log(chalk.blue('sync complete'))
                    if(settings.save == true) save_response(data)
                }

                if (error) console.log(error)
            }
        )
    } else {
        console.log('function type not supported')
    }

}

/*
--- SAVE RESPONSE ---
Save response as a .json file if the settings.save flag is true
*/
function save_response(data){
    if (Object.keys(data).length > 0) {
        var transformStream = JSONStream.stringify();
        var outputStream = fs.createWriteStream(__dirname + `/data_download_${new Date().toISOString()}.json`);
        transformStream.pipe(outputStream);
        Object.keys(data).forEach(key => {
            data[key].forEach(transformStream.write);
        })
        transformStream.end();
        outputStream.on("finish", function handleFinish() {
            console.log(chalk.green("JSONStream serialization complete!"));
            console.log("- - - - - - - - - - - - - - - - - - - - - - -");
        });
    }
}


/*
--- TEST ---
Will call the custom function once, regardless of hasMore flag.
Console log outputs a parsed json response.
*/
const test = async (func, state = {}, secrets = settings.secrets) => {

    if (settings.type == 'lambda') {

        let res = await func(
            {
                state: state,
                secrets: secrets
            },
            null,
            (error, response) => {
                console.log(JSON.parse(response))
                if (error) console.log(error)
            }
        )
    } else {
        console.log('function type not supported')
    }

}

/*
--- RUN ---
Handles the loading of the custom function and which emulation method to use.
*/
function run(overrides) {

    settings = { ...settings, ...overrides }

    const func = require(settings.path)

    if (settings.test == true) {
        test(func[settings.entry])
    } else {
        sync(func[settings.entry])
    }

}

run() // init