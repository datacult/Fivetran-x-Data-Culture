# Creted by Shreya Thakur for Data Culture
# http://www.datacult.com

# This file is an example of a custom Fivetran connector in Python
# This particular example connects Fivetran with Wikipedia 

import requests
import json
import os
from datetime import datetime


def handler(request):
	
	state = request["state"]
	secret = request["secrets"]
	# 'fivetran_format' : Data structure required by Fivetran
	# Note: 'logevents' is the table name and can be changed. multiple tables can be updated in the same call
	fivertran_format = {
		"state" : {},
		"insert" : {
			"logevents" : [],
		},
		"delete" : {
			"logevents" : [],
		},
		"schema" : {
			"logevents": {
                		"primary_key": ["log_id"]
            },
		},
		"hasMore" : False
	}

	# fill out any default state for initial call 
	if len(state) == 0 :
		state = {
			# if no last_update timestamp is provided, start from 01/01/1970
			"last_updated" : datetime(1970,1,1,0,0).strftime("%Y-%m-%dT%H:%M:%SZ")
		}

	# params from https://en.wikipedia.org/w/api.php?action=help&modules=query%2Blogevents
	request_params = {
		"action" : "query",
		"list" : "logevents",
		"letitle" : "Data",
		"ledir": "newer",
        	"lestart": state["last_updated"],
        	"lelimit": "5",
        	"format": "json"
	}

	# add pagination parameter if required
	if 'continue' in state:
		request_params['lecontinue'] = state['continue']


	api_call_timestamp = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
	
	# Make request to API 
	response = requests.get(
		url = request['secrets']['BASE_URL'],
		params = request_params
	)
	# an extra line in python to pass the result as a dictionary 
	response = json.loads(response.content)
	entries = []

	# Check that response is not empty
	if 'query' in response and 'logevents' in response['query']:
		for d in response['query']['logevents']:
			# Any required data manipulation can go here 
			entries.append(d)

	# --- PAGINATION & INCREMENTAL UPDATES ---
	hasMore = False
	if 'continue' in response:
		state['continue'] = response['continue']['lecontinue']
		hasMore = True
	else:
		#updated the last_updated state to the time at the start of the API call (to ensure no updates are missed on the next call)
		state['last_updated'] = api_call_timestamp
		if 'continue' in state:
			del state['continue']



	# Insert into fivetran structure
	fivertran_format['insert']['logevents'] = entries
	fivertran_format['state'] = state
	fivertran_format['hasMore'] = hasMore

	print(json.dumps(fivertran_format))
	# Return to Fivetran 
	return fivertran_format


# make a call to handler
handler({
        "secrets" : {"BASE_URL": "https://en.wikipedia.org/w/api.php" },
        "state": {}
        })














