import { EventBridgeClient, PutEventsCommand }from '@aws-sdk/client-eventbridge';
import { validate } from 'uuid';

const _eventBridgeClient = new EventBridgeClient({
    region: process.env.AWS_REGION
});

// TODO: Convert this function into add update function

const validateRequiredFields = async (requestBody) => {
    const requiredFields = ['name', 'address', 'city', 'state', 'zip', 'country'];

    for (const field of requiredFields) {
        if (!requestBody[field]) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: `Missing required field: ${field}`
                })
            };
        }
    }
};

export const handler = async (event) => {
    console.log('addHouse called');
    
    try
    {
        // Parse the incoming request body
        const requestBody = JSON.parse(event.body);
        
        // Get user information from incognito user
        const userID = event.requestContext.authorizer.claims.sub;
        const userEmail = event.requestContext.authorizer.claims.email;
        
        validateRequiredFields(requestBody);

        // Create house record
        const timestamp = new Date().toISOString();
        const houseID = 'House#' + timestamp + Math.random().toString(36).substr(2, 9);
        //const houseID = 'HOUSE#${timestamp}_${Math.random().toString(36).substr(2,9)}';

        const params = {
            Entries: [
                {
                    EventBusName: process.env.EVENT_BUS_NAME,
                    Source: 'addupdate.house',
                    DetailType: 'AddUpdateHouse',
                    Detail: JSON.stringify({
                        eventName: 'HOUSE_ADD_UPDATE',
                        data: {
                            pkID: userID,
                            stID: houseID,
                            name: requestBody.name,
                            address: requestBody.address,
                            city: requestBody.city,
                            state: requestBody.state,
                            zip: requestBody.zip,
                            country: requestBody.country,
                            createdAt: timestamp,
                            updatedAt: timestamp,
                            createdBy: userID,
                            updatedBy: userID,
                            // TODO: Add a way to insert an image link to the house
                        }
                    }),
                }
            ]
        };

        // Send to Event Bridge
        try
        {
            const response = await _eventBridgeClient.send(new PutEventsCommand(params));
            console.log('Event Bridge response (add House): ', JSON.stringify(response, null, 2));
        }
        catch (error)
        {
            console.error('Error sending event to Event Bridge:', error);
            return {
                statusCode: error.statusCode || 500,
                body: JSON.stringify({
                    error: error.message || 'Internal server error'
                })
            };
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'House added successfully',
                houseID: houseID
            })
        };
    }
    catch (error) 
    {
        console.error('Unable to add a new house:', error);
        return {
            statusCode: error.statusCode || 500,
            body: JSON.stringify({ 
                error: error.message || 'Internal server error'
            })
        };
    }
};

