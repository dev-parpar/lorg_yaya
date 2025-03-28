import { createStackNavigator } from '@react-navigation/stack';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import EmailVerificationScreen from '../screens/EmailVerificationScreen';

const Stack = createStackNavigator();

export default function AppNavigation() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="SignIn"
        component={SignInScreen}
        options={{ title: 'Sign In' }}
        />
      <Stack.Screen
        name="SignUp" 
        component={SignUpScreen}
        options={{ title: 'Sign Up' }}
      />
      <Stack.Screen
        name="EmailVerification"
        component={EmailVerificationScreen}  // TODO: fix this 
        options={{ title: 'Verify Email' }}
      />

    </Stack.Navigator>
  );
}