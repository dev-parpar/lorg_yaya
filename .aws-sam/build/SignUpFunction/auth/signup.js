const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider();

exports.handler = async (event) => {
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
          Name: 'given_name', // Cognito's standard attribute for first name
          Value: firstName
        },
        {
          Name: 'family_name', // Cognito's standard attribute for last name
          Value: lastName
        }
      ]
    };

    const signUpResponse = await cognito.signUp(params).promise();
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'User registration successful',
        userSub: signUpResponse.UserSub
      })
    };
  } catch (error) {
    console.error('Signup error:', error);
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({ 
        error: error.message || 'Internal server error'
      })
    };
  }
};