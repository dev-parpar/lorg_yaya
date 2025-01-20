import { DynamoDBClient} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const _dynamoDBClient = new DynamoDBClient({});
const _docClient = DynamoDBDocumentClient.from(_dynamoDBClient);


const generateKeys = (eventName, data) => {
    switch (eventName)
    {
        case 'USER_PROFILE_CREATE':
        case 'USER_PROFILE_UPDATE':
            return {
                primary_key: `USER#${data.sub}`,
                sort_key: `PROFILE#${data.sub}`
            };
        default:
            return {};
    }
}

const createItem = (eventName, data) => {
    const keys = generateKeys(eventName, data);

    // create item with keys, data and metadata
    return {
        ...keys,
        ...data,
        _metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    };
};

const saveItemToDb = async (item) => {
    try
    {
        console.log('DynamoDb tablename: ', process.env.DYNAMODB_TABLE_NAME);
        await _docClient.send(new PutCommand({
            TableName: process.env.DYNAMODB_TABLE_NAME,
            Item: item

        }));
        return true;
    }
    catch (error)
    {
        console.log('Error saving item to db', error);
        return false;
    }
};

export const handler = async (event) => {
    console.log('userDataToDb Event', event);
    try
    {
        const { eventName, data } = event.detail;

        // Create Item with all attributes
        const item = createItem(eventName, data);

        await saveItemToDb(item);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Data stored succesfully',
                primary_key: item.primary_key,
                sort_key: item.sort_key
            })
        };
    }
    catch (error)
    {
        console.log('Error', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error storing data',
                error: error.message
            })
        };
    }
};

