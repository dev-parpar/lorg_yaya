import { DynamoDBClient} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { PKPrefix, EventType, isValidEventType, isValidPKPrefix } from '../utils/enums.js';

const _dynamoDBClient = new DynamoDBClient({});
const _docClient = DynamoDBDocumentClient.from(_dynamoDBClient);


const generateKeys = (eventName, data) => {
    switch (eventName)
    {
        case EventType.USER_PROFILE_CREATE:
        case EventType.USER_PROFILE_UPDATE:
            return {
                primary_key: `${PKPrefix.USER}${data.pkID}`,
                sort_key: `${PKPrefix.PROFILE}#${data.stID}`
            };
        case EventType.HOUSE_ADD_UPDATE:
        case EventType.CREATE_ITEM:
        case EventType.ADD_ITEM:
        case EventType.UPDATE_HOUSE_ITEM:
            return {
                primary_key: `${data.pkID}`,
                sort_key: `${data.stID}`
            };
        default:
            return {};
    }
}

const isUpdateEvent = (eventName) => {
    const updateEvents = [
        EventType.UPDATE_HOUSE_ITEM,
        EventType.USER_PROFILE_UPDATE,
        // Add other update event types here
    ];
    return updateEvents.includes(eventName);
};

const updateItem = (eventName, data) => {
    const keys = generateKeys(eventName, data);

    // I am doing this write nowwwww
    // Figure out how to update the data in the db
}

const createItem = (eventName, data) => {
    const keys = generateKeys(eventName, data);

    // create item with keys, data and metadata
    return {
        ...keys,
        ...data,
        _metadata: {
            updatedAt: new Date().toISOString()
        }
    };
};

const createPutCommand = (tableName, item) => {
    return new PutCommand({
        TableName: tableName,
        Item: {
            ...item,
            _metadata: {
                updatedAt: new Date().toISOString()
            }
        }
    });
};

const saveItemToDb = async (eventName, data) => {
    try {
        console.log('Processing event:', eventName);
        console.log('Data:', JSON.stringify(data, null, 2));

        const keys = generateKeys(eventName, data);
        const tableName = process.env.DYNAMODB_TABLE_NAME;

        if (!tableName) {
            throw new Error('DYNAMODB_TABLE_NAME environment variable is not set');
        }

        let command;
        if (isUpdateEvent(eventName)) {
            command = createUpdateCommand(tableName, keys, data);
            console.log('Update command params:', JSON.stringify(command.input, null, 2));
        } 
        else {
            command = createPutCommand(tableName, { ...keys, ...data });
            console.log('Put command params:', JSON.stringify(command.input, null, 2));
        }

        const result = await _docClient.send(command);
        console.log('DynamoDB operation successful:', JSON.stringify(result, null, 2));
        return { success: true, result };
    } catch (error) {
        console.error('Error saving item to db:', error);
        throw error; // Let the handler deal with the error
    }
};


const createUpdateCommand = (tableName, keys, data) => {
    const updateExpressions = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    // Exclude keys and handle nested objects
    const { primary_key, sort_key, ...updateData } = data;

    // Build update expression for each field
    Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {  // Only include defined values
            updateExpressions.push(`#${key} = :${key}`);
            expressionAttributeValues[`:${key}`] = value;
            expressionAttributeNames[`#${key}`] = key;
        }
    });

    // Add metadata
    updateExpressions.push('#metadata = :metadata');
    expressionAttributeNames['#metadata'] = '_metadata';
    expressionAttributeValues[':metadata'] = {
        updatedAt: new Date().toISOString()
    };

    return new UpdateCommand({
        TableName: tableName,
        Key: keys,
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
        ReturnValues: 'ALL_NEW'
    });
};


const validateEvent = (event) => {
    if (!event.detail) {
        throw new Error('Event detail is missing');
    }

    const { eventName, data } = event.detail;

    if (!eventName || !isValidEventType(eventName)) {
        throw new Error(`Invalid or missing event name: ${eventName}`);
    }

    if (!data || !data.pkID || !data.stID) {
        throw new Error('Required fields pkID or stID are missing in data');
    }

    return { eventName, data };
};



export const handler = async (event) => {
    console.log('UserDataTODb Received event:', JSON.stringify(event, null, 2));
    
    try {
        const { eventName, data } = validateEvent(event);

        if(!data.pkID || !data.stID)
        {
            console.log('No pkID or stID found. Not storing the data in the db');   
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: 'pkID or stID was requried but was not found.',
                })
            };
        }
        
        const result = await saveItemToDb(eventName, data);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Data stored successfully',
                primary_key: data.pkID,
                sort_key: data.stID,
                result: result
            })
        };
    } catch (error) {
        console.error('Error in handler:', error);
        
        return {
            statusCode: error.statusCode || 500,
            body: JSON.stringify({
                message: 'Error processing request',
                error: error.message
            })
        };
    }
};

