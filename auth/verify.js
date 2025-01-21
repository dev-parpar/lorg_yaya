import { 
    CognitoIdentityProviderClient, 
    ConfirmSignUpCommand,
    AdminGetUserCommand 
} from "@aws-sdk/client-cognito-identity-provider";

import { PutEventsCommand, EventBridgeClient } from '@aws-sdk/client-eventbridge';

const client = new CognitoIdentityProviderClient({ 
    region: process.env.AWS_REGION
});

const _eventBridgeClient = new EventBridgeClient({
    region: process.env.AWS_REGION
});


const getUserAttributes = async (email) => {
    try
    {
        const command = new AdminGetUserCommand({
            UserPoolId: process.env.USER_POOL_ID,
            Username: email
        });
        
        const response = await client.send(command);

        const attributes = {};
        response.UserAttributes.forEach(attr => {
            attributes[attr.Name] = attr.Value;
        });

        return attributes;
    }
    catch (error)
    {
        console.error('Error getting user attributes:', error);
        throw error;
    }
};

// TODO: Create a class that helps ease out the process of creating event formats
const sendEventToEventBridge = async (email, UserAttributes) => {
    console.log('Event bus name:', process.env.EVENT_BUS_NAME);
    const params = {
        Entries: [
            {
                EventBusName: process.env.EVENT_BUS_NAME,
                Source: 'custom.auth',
                DetailType: 'ProfileCreation',
                Detail: JSON.stringify({
                    eventName: 'USER_PROFILE_CREATE',
                    data: {
                        pkID: UserAttributes.sub,
                        stID: UserAttributes.sub,
                        email: email,
                        firstName: UserAttributes.given_name,
                        lastName: UserAttributes.family_name,
                        profileCreatedAt: new Date().toISOString()
                    }
                }),
                
            }
        ]
    };
    console.log('Event params: ', JSON.stringify(params,null, 2));
    try
    {
        const rr = await _eventBridgeClient.send(new PutEventsCommand(params));
        console.log('EventBridge response: ', JSON.stringify(rr, null, 2));
    }
    catch (error)
    {
        console.error('Error sending event to EventBridge:', error);
        throw error;
    }
};

export const handler = async (event) => {
    try 
    {
        const { email, code } = JSON.parse(event.body);
        
        // Input validation
        if (!email || !code) {
            return {
                statusCode: 400,
                body: JSON.stringify({ 
                    error: 'Email and verification code are required' 
                })
            };
        }

        const params = {
            ClientId: process.env.COGNITO_CLIENT_ID,
            Username: email,
            ConfirmationCode: code
        };

        const command = new ConfirmSignUpCommand(params);
        await client.send(command);
        
        // Get existing user Info
        const UserAttributes = await getUserAttributes(email);

        await sendEventToEventBridge(email, UserAttributes);

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                message: 'Email verification successful'
            })
        };
    } 
    catch (error) 
    {
        console.error('Verification error:', error);
        return {
            statusCode: error.statusCode || 500,
            body: JSON.stringify({ 
                error: error.message || 'Internal server error'
            })
        };
    }
};