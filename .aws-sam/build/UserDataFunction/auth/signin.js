import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";

//const cognito = new AWS.CognitoIdentityServiceProvider();

const client = new CognitoIdentityProviderClient({
  region: process.env.REGION
});

export const handler = async (event) => {
    try 
    {
        const { email, password } = JSON.parse(event.body);
        
        // Input validation
        if (!email || !password) 
        {
            return {
                statusCode: 400,
                body: JSON.stringify({ 
                    error: 'Email and password are required' 
                })
            };
        }

        const params = 
        {
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: process.env.COGNITO_CLIENT_ID,
            AuthParameters: {
                USERNAME: email,
                PASSWORD: password
            }
        };

        const command = new InitiateAuthCommand(params);
        const response = await client.send(command);
        
        return {
            statusCode: 200,
            body: JSON.stringify({ 
                message: 'Successfully signed in',
                tokens: {
                    accessToken: response.AuthenticationResult.AccessToken,
                    refreshToken: response.AuthenticationResult.RefreshToken,
                    idToken: response.AuthenticationResult.IdToken,
                    expiresIn: response.AuthenticationResult.ExpiresIn
                }
            })
        };
    } 
    catch (error) 
    {
        console.error('Signin error:', error);
        
        // Handle specific Cognito errors
        switch(error.name) {
            case 'UserNotConfirmedException':
                return {
                    statusCode: 400,
                    body: JSON.stringify({ 
                        error: 'Please verify your email first'
                    })
                };
            case 'NotAuthorizedException':
                return {
                    statusCode: 401,
                    body: JSON.stringify({ 
                        error: 'Incorrect username or password'
                    })
                };
            case 'UserNotFoundException':
                return {
                    statusCode: 404,
                    body: JSON.stringify({ 
                        error: 'User does not exist'
                    })
                };
            default:
                return {
                    statusCode: 500,
                    body: JSON.stringify({ 
                        error: 'Internal server error',
                        details: error.message
                    })
                };
        }
    }
};