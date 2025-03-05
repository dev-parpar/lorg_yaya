import axios from 'axios';
import { SignUpFormData } from '../types/auth.types';

// TODO: Add to config
const API_URL = 'https://73gkv63pk4.execute-api.us-east-2.amazonaws.com/test'; // Replace with your actual backend URL

export const authService = {
  async signUp(data: SignUpFormData) {
    try {
      const response = await axios.post(`${API_URL}/auth/signup`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};