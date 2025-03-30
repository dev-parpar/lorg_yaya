import { DynamoDBClient} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const dynamoDB = new AWS.DynamoDB.DocumentClient();

const validateQueryInput = (queryInput) => {
  // Add input validation rules
  if (!queryInput || typeof queryInput !== 'object') {
    throw new Error('Invalid query input');
  }
  
  // Validate required fields based on query type
  if (queryInput.queryType === 'specific' && !queryInput.pk) {
    throw new Error('Primary key is required for specific queries');
  }

  // Add more validation rules as needed
};

const buildQueryParams = (queryInput) => {
    validateQueryInput(queryInput);

    const {
        queryType,    // Add a queryType to determine the kind of query
        pk,
        sk,
        filters,
        attributes,
        limit,
        paginationToken
    } = queryInput;

    let params = {
        TableName: process.env.DYNAMODB_TABLE_NAME,
        ExpressionAttributeValues: {},
        ExpressionAttributeNames: {}
    };

    // Build key conditions
    let keyConditions = [];
    if (pk) {
        keyConditions.push('primary_key = :pk');
        params.ExpressionAttributeValues[':pk'] = pk;
    }
    if (sk) {
        keyConditions.push('sort_key = :sk');
        params.ExpressionAttributeValues[':sk'] = sk;
    }
    if (keyConditions.length > 0) {
        params.KeyConditionExpression = keyConditions.join(' AND ');
    }

    // Handle filter conditions with additional security checks
    if (filters && typeof filters === 'object') {
        let filterExpressions = [];
        Object.entries(filters).forEach(([key, value], index) => {
            // Validate key names to prevent injection
            if (!/^[\w-]+$/.test(key)) {
                throw new Error('Invalid filter key format');
            }
            
            const attrName = `#attr${index}`;
            const attrValue = `:val${index}`;
            filterExpressions.push(`${attrName} = ${attrValue}`);
            params.ExpressionAttributeNames[attrName] = key;
            params.ExpressionAttributeValues[attrValue] = value;
        });
        params.FilterExpression = filterExpressions.join(' AND ');
    }

    // Handle projection expressions with validation
    if (Array.isArray(attributes)) {
        const validatedAttributes = attributes.filter(attr => 
            typeof attr === 'string' && /^[\w-]+$/.test(attr)
        );
        
        params.ExpressionAttributeNames = validatedAttributes.reduce((acc, attr, index) => {
            acc[`#proj${index}`] = attr;
            return acc;
        }, params.ExpressionAttributeNames || {});
        
        params.ProjectionExpression = validatedAttributes
            .map((_, index) => `#proj${index}`)
            .join(', ');
    }

    // Handle pagination with validation
    if (limit && Number.isInteger(limit) && limit > 0 && limit <= 100) {
        params.Limit = limit;
    }
    
    if (paginationToken) {
        try {
            params.ExclusiveStartKey = paginationToken;
        } catch (error) {
            throw new Error('Invalid pagination token');
        }
    }

    return params;
};

exports.handler = async (event) => {
    try {
        // Parse the body content
        const queryInput = JSON.parse(event.body);
        
        // Add request metadata
        const requestMetadata = {
            userId: event.requestContext.authorizer.claims.sub,
            timestamp: new Date().toISOString(),
            sourceIp: event.requestContext.identity.sourceIp
        };

        // Log request metadata (for audit purposes)
        console.log('Request metadata:', requestMetadata);

        const params = buildQueryParams(queryInput);

        // Execute query based on queryType
        let result;
        if (params.KeyConditionExpression) {
            result = await dynamoDB.query(params).promise();
        } else {
            // Add additional controls for scan operations
            if (!requestMetadata.userId) {
                throw new Error('Unauthorized scan operation');
            }
            result = await dynamoDB.scan(params).promise();
        }

        // Sanitize response data if needed
        const sanitizedItems = result.Items.map(item => {
            // Add any necessary data sanitization
            return item;
        });

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
                'Content-Security-Policy': "default-src 'self'",
                'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
            },
            body: JSON.stringify({
                message: 'Data retrieved successfully',
                data: sanitizedItems,
                paginationToken: result.LastEvaluatedKey,
                count: result.Count
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: error.statusCode || 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true
            },
            body: JSON.stringify({
                message: 'Error retrieving data',
                error: 'An error occurred while processing your request'  // Generic error message
            })
        };
    }
};