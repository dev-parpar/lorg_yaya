//const AWS = require('aws-sdk');
import { CognitoIdentityProviderClient, SignUpCommand } from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({
  region: process.env.REGION
});

export const handler = async (event) => {
  try {
      const { email, password, firstName, lastName } = JSON.parse(event.body);
      
      // Input validation
      if (!email || !password || !firstName || !lastName) {
          return {
              statusCode: 400,
              body: JSON.stringify({ 
                  error: 'All fields are required (email, password, firstName, lastName)' 
              })
          };
      }

      const params = {
          ClientId: process.env.COGNITO_CLIENT_ID,
          Username: email,
          Password: password,
          UserAttributes: [
              {
                  Name: 'email',
                  Value: email
              },
              {
                  Name: 'given_name',
                  Value: firstName
              },
              {
                  Name: 'family_name',
                  Value: lastName
              }
          ]
      };

      // Create and send the SignUp command
      const command = new SignUpCommand(params);
      const signUpResponse = await client.send(command);
      
      return {
          statusCode: 200,
          body: JSON.stringify({ 
              message: 'User registration successful',
              userSub: signUpResponse.UserSub
          })
      };
  } catch (error) {
      console.error('Signup error:', error);

      switch(error.Name)
      {
        case 'UsernameExistsException':
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'An account with this email already exists'
                })
            };
        case 'InvalidPasswordException':
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Password does not meet requirements. Password must have at least 8 characters, including uppercase and lowercase letters, numbers, and symbols'
                })
            };
        case 'InvalidParameterException':
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Invalid parameter provided. Please check your input'
                })
            };
        case 'TooManyRequestsException':
            return {
                statusCode: 429,
                body: JSON.stringify({
                    error: 'Too many requests. Please try again later'
                })
            };
        default:
            return {
                statusCode: error.statusCode || 500,
                body: JSON.stringify({
                    error: 'An unexpected error occurred. Please try again later'
                })
            };
      }
  }
};
