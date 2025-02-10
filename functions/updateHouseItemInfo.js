import { EventBridgeClient, PutEventsCommand }from '@aws-sdk/client-eventbridge';
import { PKPrefix, EventType, isValidEventType, isValidPKPrefix } from '../utils/enums.js';

const _eventBridgeClient = new EventBridgeClient({
    region: process.env.AWS_REGION
});

// TODO: Convert this function into add update function
const validateRequiredFields = async (requestBody) => {
    const requiredFields = ['item_ID ', 'house_ID'];

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

const updateObject = (requestBody) => {
    const updateData = {
        pkID: requestBody.house_ID,
        stID: requestBody.item_ID,
        updatedAt: new Date().toISOString()
    }

    return updateData;
}

export const handler = async (event) => {
    console.log('updateItem called');
    
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
            
        const house_item_data = updateObject(requestBody);
        if (requestBody.qty !== undefined) house_item_data.item_qty = requestBody.qty;
        if (requestBody.start_date !== undefined) house_item_data.start_date = requestBody.start_date;
        if (requestBody.end_date !== undefined) house_item_data.end_date = requestBody.end_date;
        house_item_data.updatedBy = userID;

        const params = {
            Entries: [
                {
                    EventBusName: process.env.EVENT_BUS_NAME,
                    Source: 'update.house.item',
                    DetailType: 'UpdateHouseItem',
                    Detail: JSON.stringify({
                        eventName: EventType.UPDATE_HOUSE_ITEM,
                        data: house_item_data
                    }),
                }
            ]
        };

        // Send to Event Bridge
        try
        {
            const response = await _eventBridgeClient.send(new PutEventsCommand(params));
            console.log('Event Bridge response (update house Item Info): ', JSON.stringify(response, null, 2));
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
                //TODO: Update code to utilize actual Item Name and House Name. Could be done in front end probably!!
                message: 'Item ' + itemID + ' in house '+ houseID + ' added successfully to house',
            })
        };
    }
    catch (error) 
    {
        console.error('Unable to update item in house:', error);
        return {
            statusCode: error.statusCode || 500,
            body: JSON.stringify({ 
                error: error.message || 'Internal server error'
            })
        };
    }
};

