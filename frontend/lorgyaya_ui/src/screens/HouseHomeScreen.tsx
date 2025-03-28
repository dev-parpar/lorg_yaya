import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation.types';
import { House } from '../types/auth.types';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'HouseBase'>;
};



export default function HouseHomeScreen({ navigation }: Props) {
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHouses();
  }, []);

  const fetchHouses = async () => {
    try {
      // TODO: Add API call to fetch houses
      setLoading(false);
    } catch (error) {
      console.error('Error fetching houses:', error);
      setLoading(false);
    }
  };

  const renderHouseCard = ({ item }: { item: House }) => (
    <TouchableOpacity 
      style={styles.houseCard}
      onPress={() => {
        // TODO: Navigate to house detail screen
        console.log('Navigate to house:', item.id);
      }}
    >
      <Text style={styles.houseName}>{item.name}</Text>
      <Text style={styles.houseAddress}>{item.address}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={houses}
        renderItem={renderHouseCard}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No houses added yet</Text>
          </View>
        }
      />

      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => navigation.navigate('AddHouse')}
      >
        <Text style={styles.addButtonText}>+ Add New House</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  houseCard: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  houseName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  houseAddress: {
    color: '#666',
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});