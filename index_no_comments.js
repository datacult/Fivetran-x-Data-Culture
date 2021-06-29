
const axios = require('axios');

exports.handler = async (request, context, callback) => {
    callback(null, await update(request.state, request.secrets));
};

async function update(state, secrets) {

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

    if (Object.keys(state).length == 0) {
        state = {
            last_updated: new Date(0).toISOString()
        }
    }

    let response = await apiResponse(state, secrets);
    
    if (Array.isArray(response)) {
        
        let [entries, stateUpdate, more] = response
        
        fivetran_structure.state = stateUpdate
        fivetran_structure.insert.logevents = entries
        fivetran_structure.hasMore = more

        return (fivetran_structure);

    } else {
        return response
    }

}


async function apiResponse(state, secrets) {

    const params = {
        action: 'query',
        list: 'logevents',
        letitle: 'Data',
        ledir: 'newer',
        lestart: state.last_updated,
        lelimit: 5,
        format: 'json'
    }

    if (state.continue) params.lecontinue = state.continue

    try {

        let api_call_timestamp = new Date().toISOString()

        const response = await axios.get(`${secrets.BASE_URL}`, {params: params});

        let entries = []

        if (response.data.hasOwnProperty('query') && response.data.query.hasOwnProperty('logevents')) {
            response.data.query.logevents.forEach(d => {
                entries.push(d)
            })
        }

        let hasMore = false

        if (response.data.hasOwnProperty('continue')) {
            state.continue = response.data.continue.lecontinue
            hasMore = true
        } else {
            state.last_updated = api_call_timestamp
            delete state.continue
        }

        return [entries, state, hasMore];

    } catch (error) {
        console.log("error: ", error);
        console.log("state: ", state);

        return { "errorMessage": error }
    }

}