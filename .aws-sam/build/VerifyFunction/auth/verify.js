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

const sendEventToEventBridge = async (email, UserAttributes) => {
    const params = {
        Entries: [
            {
                Source: 'custom.auth',
                DetailType: 'ProfileCreation',
                Detail: JSON.stringify({
                    eventName: 'USER_PROFILE_CREATE',
                    data: {
                        email: email,
                        firstName: UserAttributes.given_name,
                        lastName: UserAttributes.family_name,
                        profileCreatedAt: new Date().toISOString()
                    }
                }),
                EventBusName: process.env.EVENT_BUS_NAME
            }
        ]
    };

    try
    {
        await _eventBridgeClient.send(new PutEventsCommand(params));
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