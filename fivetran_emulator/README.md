# Fivetran Custom Connector Emulator
*Basic offline testing for Fivetran custom functions*

## Installation
Navigate to the directory of this emulator. run ```npm install```.

## Setup
This emulator by default is designed to run with the Fivetran x Data Culture Custom Connector Template however can be easily be adapted to run with any custom connector function. At the top of the ```index.js``` file there is a single ```settings``` object containing all options for the emulator.

```javascript
let settings = {
    type: "lambda", // lambda or GCF (GCF not yet implemented)
    path: "../index.js", // filepath of custom function
    entry: "handler", // entry point to the custom function
    test: false, // true will run a single call to the function. false will continue to call until hasMore == false
    save: false, // save a local file of the results once sync has finished
    secrets: {
        BASE_URL: process.env.BASE_URL, // add any environment variables here to be loaded in from .env file. This replicates the secrets passed from the Fivetran Custom Connector
    }
}
```

## Run 
After checking / amending the settings, navigate to the directory of this emulator and run ```node index.js```.

