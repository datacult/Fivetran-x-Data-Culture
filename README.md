# Fivetran x Data Culture

_Fivetran Custom Connector Template_

This repo is part of the [Fivetran x Data Culture collaboration event](https://www.eventbrite.com/e/lunch-learn-continuous-data-ingestion-using-fivetran-custom-connectors-tickets-159677649147) on Continuous Data Ingestion using Custom Connectors.

This is an example function written in [node.js](https://nodejs.org/en/) for use with Fivetran's custom connector feature.
The example uses the [Wikipedia API](https://en.wikipedia.org/w/api.php) to call an initial dataset and maintain continuous updates; however the template is designed to be easily adaptable for any data source including both REST and GraphQL types.

## Function Testing - Fivetran Emulator

The Fivetran emulator function is designed to replicate the Fivetran custom connector on a _basic_ level. No ingestion is passed to Fivetran through this emulator and no scheduling takes place. It can be used to observe the output (via console logs) of the custom function and test the `hasMore` feature. The emulator can be used to save data to a `.json` file for data quality assurance checks. Details of how to use the emulator are in the [emulator readme.md](./fivetran_emulator/README.md)

## Installation

Navigate to the directory of this custom function. run `npm install`.
The same process needs to be repeated in the `fivetran_emulator` folder (as they are designed to run independently).

## Links

[Fivetran Custom Connector Setup](https://fivetran.com/docs/functions)  
[Data Culture](https://www.datacult.com/)  
[Fivetran](https://fivetran.com/)

## Notes

- `index.js` filename can be changed.
- AWS Lambda requires a zip file including node_modules folder
- Google Cloud Functions will install dependencies from package.json

---
## Code Explanation

### Handler

The handler is the entry point to the custom function. It does not have to be called `handler` and can be renamed, however this is the default name selected in AWS lambda. The handler is responsible for receiving variables from Fivetran and returning the completed response. The `request` parameter receives a json object in the format.

```javascript
{
  "secrets": {
    // Any secrets provided in the Fivetran UI during setup will be here
  },
  "state": {
    // Initially the state is an empty object
  }
}
```

The response object needs to be in a Fivetran specific format.

```javascript
{
  "state": {},
  "insert": {
    "logevents": [] // name of the table within the schema (specified during the Fivetran connector setup) to insert records. Data can be inserted into multiple tables at once.
  },
  "delete": {},
  "schema": {
    "logevents": {
      "primary_key": ["logid"] // identifying the primary key will allow Fivetran to update items
    }
  },
  "hasMore": false
}
```

The handler varies slightly depending on where the custom function is being hosted. This is the only part of the custom function that needs to change between hosting environments. In this template the only logic stored in the handler is to call an `update` function and await the response before returning the response to Fivetran.

```javascript
// AWS Lambda entry point
exports.handler = async (request, context, callback) => {
  callback(null, await update(request.state, request.secrets));
};

// Google Cloud Function entry point
exports.handler = async (req, res) => {
  if (req.body.state === undefined)
    res.status(400).send("No state is defined!");

  if (req.body.secrets === undefined)
    res.status(400).send("No secrets is defined!");

  res.header("Content-Type", "application/json");

  res.status(200).send(await update(req.body.state, req.body.secrets));
};
```

### State

The state object is a json object that can be filled with any values that you may need to keep track of the progress of data ingestion. Popular variables to include in the state are a timestamp of the last ingestion (for incremental updates) or a pagination number (for paginated results).
The state is stored by Fivetran and sent with each request to the custom function. When returning the response to Fivetran, the function includes an updates state object.

*Hint: The state object is visible in the logs of the Fivetran UI, which is useful for tracking. It is therefore possible to add any error handling messages to the state if required.*

### hasMore

The `hasMore` flag is used to assist with pagination of the API response. If `hasMore` is set to `true`, Fivetran will immediately send an additional request to the custom function (with the updated state function). When the flag is `false` Fivetran will wait for a set time period (set in the Fivetran UI) before sending another request to the custom function.

### API Call

The API call can be made using a variety of http request clients or API specific libraries. The template example uses [Axios](https://github.com/axios/axios) as this can easily be adapted to most API endpoints. 
The basic setup of an API request
- API URL (may be a specific endpoint)
- Parameters to be passed to the Endpoint
- Authentication & headers (may not be required for all API's)

```javascript
// API Specific Parameters (these are example parameters for the Wikipedia API)
const params = {
  action: "query",
  list: "logevents",
  format: "json",
};

// Optional headers and authentication information can be included if required by the API
const headers = {
  API_KEY: secrets.API_KEY,
};
const auth = { username: secrets.USERNAME, password: secrets.PASSWORD };
```

The API request takes time, so it is important that the call is made in an [async](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function) function. Inside an async function we can use the ```await``` keyword to wait for the result before continuing with the script. 
Once the response is received, the code can be processed (if required) and returned, alongside an updated [state](#state)) and [hasMore](#hasmore) flag. Processing into the Fivetran format is handled in the ```update``` function.

```javascript
// a try / catch block is used to handle any errors from the API call.
try {

    // make request to API
    const response = await axios.get(`${secrets.BASE_URL}`, {
        params: params,
        headers: headers,
        auth: auth
    });

    let entries = [];

    response.data.forEach((d) => {
        // any required data manipulation can go here before pushing to data array
        entries.push(d);
    });

    return [
        entries,
        state, // updated state
        hasMore // hasMore flag
    ];
    
} catch (error) {
    // output any errors to the AWS of GCF logs
    console.log("error: ", error);
    console.log("state: ", state);
}
```

## Example workflow with incremental updates

### Initial Call

- state object is empty
- fill state with starting date (beginning of EPOCH time should work)

```javascript
new Date(0).toISOstring();
```

- call api including a 'start from' date (this will vary dependent on the API)
- update state with new timestamp 
*Hint: Capturing the timestamp directly before the API call will ensure any updates that happen during the time taken to make the API call are still gathered in the next request to the custom function*
- return the data from the API call & updated state object

### Subsequent Calls

- state object will contain the time of the last request
- call api including a 'start from' date (the date stored in the `state` object)
  *This will provide only results after the previous API call*
- update state with new timestamp
- return the data from the API call & updated state object

## Example workflow with pagination

*This can be combined with the incremental update workflow*  
API pagination is usually done using a limit and a page number, or offset number.
`{limit:50, page:2}` would be the 51st record from the API query. This would be equal to `{limit:50, offset:50}`

- state object is empty on initial call
- fill state with starting page or offset of 0 if the state is empty
- call api with limit value and page number
  _alternatively the page number can be left out of the API call if it is not in the `state` object_
- Check if the number of results returned from the API is equal to the limit (if it is there may be more results)
  - If number of results is equal to the limit, set the `hasMore` flag to true & increase state page number.
  - If number of results does not equal limit, set the `hasMore` flag to false and reset the state page number to 0

In the template example the Wikipedia API uses a continuation number that is used in the same way that a pagination number is used (although it is a unique code for each page).

```javascript
// add pagination value to API call parameters only if there is one in the state object
if (state.continue) params.lecontinue = state.continue

...

let hasMore = false // set to false by default

if (response.data.hasOwnProperty('continue')) { // the continue property is only in the response from the API if there are more results to the query.
    state.continue = response.data.continue.lecontinue
    hasMore = true
} else {
    // updated the last_updated state to the time at the start of the API call (to ensure no updates are missed on the next call)
    state.last_updated = api_call_timestamp // captured directly before the API call
    delete state.continue
}
```
