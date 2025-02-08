import { EventBridgeClient, PutEventsCommand }from '@aws-sdk/client-eventbridge';
import { validate } from 'uuid';

const _eventBridgeClient = new EventBridgeClient({
    region: process.env.AWS_REGION
});

// TODO: Convert this function into add update function

const validateRequiredFields = async (requestBody) => {
    const requiredFields = ['name', 'type'];

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
    console.log('createItem called');
    
    try
    {
        // Parse the incoming request body
        const requestBody = JSON.parse(event.body);
        
        // Get user information from incognito user
        const userID = 'USER#' + event.requestContext.authorizer.claims.sub;
        const userEmail = event.requestContext.authorizer.claims.email;
        
        validateRequiredFields(requestBody);

        // Create house record
        const timestamp = new Date().toISOString();
        // TODO: Create meaningful Item ID
        const itemID = 'Item#' + timestamp + Math.random().toString(36).substr(2, 9);

        const params = {
            Entries: [
                {
                    EventBusName: process.env.EVENT_BUS_NAME,
                    Source: 'create.item',
                    DetailType: 'CreateItem',
                    Detail: JSON.stringify({
                        eventName: 'CREATE_ITEM',
                        data: {
                            pkID: userID,
                            stID: itemID,
                            name: requestBody.name,
                            type: requestBody.type,
                            createdAt: timestamp,
                            updatedAt: timestamp,
                            createdBy: userID,
                            updatedBy: userID,
                            // TODO: Add a way to insert an image link to the Item
                        }
                    }),
                }
            ]
        };

        // Send to Event Bridge
        try
        {
            const response = await _eventBridgeClient.send(new PutEventsCommand(params));
            console.log('Event Bridge response (create Item): ', JSON.stringify(response, null, 2));
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
                message: 'Item Created successfully',
                itemID: itemID
            })
        };
    }
    catch (error) 
    {
        console.error('Unable to create a new Item:', error);
        return {
            statusCode: error.statusCode || 500,
            body: JSON.stringify({ 
                error: error.message || 'Internal server error'
            })
        };
    }
};

