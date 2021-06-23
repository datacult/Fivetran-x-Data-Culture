# Fivetran x Data Culture
*Fivetran Custom Connector Template*

This repo is part of the [Fivetran x Data Culture collaboration event](https://www.eventbrite.com/e/lunch-learn-continuous-data-ingestion-using-fivetran-custom-connectors-tickets-159677649147) on Continuous Data Ingestion using Custom Connectors.

This is an example function written in [node.js](https://nodejs.org/en/) for use with Fivetran's custom connector feature.
The example uses the [Wikipedia API](https://en.wikipedia.org/w/api.php) to call an initial dataset and maintain continuous updates; however the template is designed to be easily adaptable for any data source including both REST and GraphQL types.

## Function Testing - Fivetran Emulator
The Fivetran emulator function is designed to replicate the Fivetran custom connector on a *basic* level. No ingestion is passed to Fivetran through this emulator and no scheduling takes place. It can be used to observe the output (via console logs) of the custom function and test the ```hasMore``` feature. The emulator can be used to save data to a ```.json``` file for data quality assurance checks. Details of how to use the emulator are in the [emulator readme.md](./fivetran_emulator/README.md)

## Installation
Navigate to the directory of this custom function. run ```npm install```.
The same process needs to be repeated in the ```fivetran_emulator``` folder (as they are designed to run independently).

## Links
[Fivetran Custom Connector Setup](https://fivetran.com/docs/functions)  
[Data Culture](https://www.datacult.com/)  
[Fivetran](https://fivetran.com/)  

## Notes
- ```index.js``` filename can be changed.
- AWS Lambda requires a zip file including node_modules folder
- Google Cloud Functions will install dependencies from package.json