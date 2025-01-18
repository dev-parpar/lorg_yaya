import { CognitoIdentityProviderClient, ConfirmSignUpCommand } from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({ 
    region: process.env.AWS_REGION
});

export const handler = async (event) => {
    try {
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
        
        return {
            statusCode: 200,
            body: JSON.stringify({ 
                message: 'Email verification successful'
            })
        };
    } catch (error) {
        console.error('Verification error:', error);
        return {
            statusCode: error.statusCode || 500,
            body: JSON.stringify({ 
                error: error.message || 'Internal server error'
            })
        };
    }
};