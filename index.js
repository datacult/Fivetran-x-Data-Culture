/*
Axios is a simple HTTP request package which can be easily adapted to call most REST OR GraphQL endpoints.
For more complex APIs there may be additional libraries in the npm package library (https://www.npmjs.com/) that may be helpful.
*/
const axios = require('axios');

// lambda entry point for the function
exports.handler = async (request, context, callback) => {
    callback(null, await update(request.state, request.secrets));
};

/*
// Google Cloud Function entry point
exports.handler = async (req, res) => {
    if (req.body.state === undefined) res.status(400).send('No state is defined!');
    
    if (req.body.secrets === undefined) res.status(400).send('No secrets is defined!');
        
    res.header("Content-Type", "application/json");	   

    res.status(200).send(await update(req.body.state, req.body.secrets));
};
*/


// Builds the data into the FiveTran required format
async function update(state, secrets) {

    // Note: 'logevents' is the table name and can be changed. multiple tables can be updated in the same call

    let fivetran_structure = {
        state: {},
        insert: {
            logevents: [],
        },
        delete: {},
        schema: {
            logevents: {
                primary_key: ['logid']
            },
        },
        hasMore: false
    }

    // fill out any default state for initial call
    if (Object.keys(state).length == 0) {
        state = {
            last_updated: new Date(0).toISOString() // if no last_update timestamp is provided, start from 01/01/1970
        }
    }


    // Fetch records using api calls
    let [entries, stateUpdate, more] = await apiResponse(state, secrets);

    // populate Fivetran structure
    fivetran_structure.state = stateUpdate
    fivetran_structure.insert.logevents = entries
    fivetran_structure.hasMore = more

    return (fivetran_structure);

}

async function apiResponse(state, secrets) {

    // params from https://en.wikipedia.org/w/api.php?action=help&modules=query%2Blogevents
    const params = {
        action: 'query',
        list: 'logevents', // type of data to return from the API
        letitle: 'Data', // title or wikipedia article to get the log of updates for
        ledir: 'newer', // order of results - oldest first
        lestart: state.last_updated, // return only results after this date
        lelimit: 2, // limit how many results to get any any one time
        format: 'json' // format of data to return from the API
    }

    // add pagination paramter if required
    if (state.continue) params.lecontinue = state.continue

    /*
    --- API AUTHENTICATION ---

    This is an example of how to pass user authentication to an API using Axios.
    Any secret keys should be passed through the secrets object from Fivetran (see BASE_URL in this example).
    The wikipedia API endpoints in this example do not need authentication.
    
    const headers = {
        'API_KEY': secrets.API_KEY
    }

    const auth = { username: secrets.USERNAME, password: secrets.PASSWORD }
    */

    try {

        /* 
        --- API CALL ---
        */

        let api_call_timestamp = new Date().toISOString()

        // make request to API
        const response = await axios.get(`${secrets.BASE_URL}`, {
            params: params,
            // headers: headers,
            // auth: auth
        });

        let entries = []

        // check that the response is not empty
        if (response.data.hasOwnProperty('query') && response.data.query.hasOwnProperty('logevents')) {

            response.data.query.logevents.forEach(d => {
                // any required data manipulation can go here before pushing to data array
                entries.push(d)
            })

        }

        /* 
        --- PAGINATION & INCREMENTAL UPDATES ---
        */

        let hasMore = false

        if (response.data.hasOwnProperty('continue')) {
            state.continue = response.data.continue.lecontinue
            hasMore = true
        } else {
            // updated the last_updated state to the time at the start of the API call (to ensure no updates are missed on the next call)
            state.last_updated = api_call_timestamp
            delete state.continue
        }

        /*
        --- RETURN RESULTS ---
        */
        return [
            entries,
            state, // updated state
            hasMore // hasMore flag
        ];

    } catch (error) {
        // If the axios call fails, an error is thrown. These console log messages will appear in the AWS Lamdba or Google Cloud Function logs.
        console.log("error: ", error);
        console.log("state: ", state)
    }

}