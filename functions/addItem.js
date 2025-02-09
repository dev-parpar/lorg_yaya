import { EventBridgeClient, PutEventsCommand }from '@aws-sdk/client-eventbridge';
import { PKPrefix, EventType, isValidEventType, isValidPKPrefix } from '../utils/enums.js';

const _eventBridgeClient = new EventBridgeClient({
    region: process.env.AWS_REGION
});

// TODO: Convert this function into add update function
const validateRequiredFields = async (requestBody) => {
    const requiredFields = ['item_ID ', 'house_ID','qty'];

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
    console.log('addItem called');
    
    try
    {
        // Parse the incoming request body
        const requestBody = JSON.parse(event.body);
        
        // Get user information from incognito user
        const userID = event.requestContext.authorizer.claims.sub;
        const userEmail = event.requestContext.authorizer.claims.email;
        
        validateRequiredFields(requestBody);

        // Create Item record
        const timestamp = new Date().toISOString();
        const itemID = requestBody.item_ID
        const houseID = requestBody.house_ID
        //const houseID = 'HOUSE#${timestamp}_${Math.random().toString(36).substr(2,9)}';

        const params = {
            Entries: [
                {
                    EventBusName: process.env.EVENT_BUS_NAME,
                    Source: 'add.item',
                    DetailType: 'AddItem',
                    Detail: JSON.stringify({
                        eventName: EventType.ADD_ITEM,
                        data: {
                            pkID: houseID,
                            stID: itemID,
                            item_qty: requestBody.qty,
                            start_date: timestamp,
                            end_date: requestBody.end_date,
                            createdAt: timestamp,
                            updatedAt: timestamp,
                            createdBy: userID,
                            updatedBy: userID
                        }
                    }),
                }
            ]
        };

        // Send to Event Bridge
        try
        {
            const response = await _eventBridgeClient.send(new PutEventsCommand(params));
            console.log('Event Bridge response (add Item): ', JSON.stringify(response, null, 2));
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
                message: 'Item added successfully to house',
                houseID: houseID,
                itemID: itemID
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

