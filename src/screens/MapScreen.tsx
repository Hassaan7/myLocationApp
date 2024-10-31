import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Linking, Platform, ActivityIndicator } from 'react-native';
import { Button } from 'react-native-paper';
import MapView, { Marker, MapPressEvent, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAbly } from '../hooks/useAbly';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Location {
  latitude: number;
  longitude: number;
}

export function MapScreen() {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const { publishLocation, otherLocations } = useAbly();

  // Add loading and error states
  const [isMapReady, setIsMapReady] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    async function setupLocationTracking() {
      try {
        // First check if location services are enabled
        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) {
          setLocationError('Location services are disabled. Please enable them in your device settings.');
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Permission to access location was denied');
          return;
        }

        setHasLocationPermission(true);

        // Get initial location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        const initialLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setCurrentLocation(initialLocation);
        setIsMapReady(true);

        // Start watching position
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 5
          },
          (newLocation) => {
            const location = {
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
            };
            setCurrentLocation(location);
            // publishLocation(location);
          }
        );
      } catch (error) {
        console.error('Error setting up location:', error);
        setLocationError(error instanceof Error ? error.message : 'Failed to get location');
      }
    }

    setupLocationTracking();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  const handleMapPress = (event: MapPressEvent) => {
    const { coordinate } = event.nativeEvent;
    setSelectedLocation(coordinate);
    publishLocation(coordinate); // Consider adjusting as needed to reduce update frequency
  };

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  // Show error state if location services are disabled
  if (locationError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{locationError}</Text>
          <Button 
            mode="contained"
            onPress={openSettings}
            style={styles.button}
          >
            Open Settings
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading state if map isn't ready
  if (!isMapReady || !currentLocation) {
    return (
      <View style={[styles.container,{justifyContent: 'center', alignItems: 'center'}]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        onPress={handleMapPress}
        showsUserLocation={true}
        showsMyLocationButton={true}
        provider={PROVIDER_GOOGLE}
      >
        {/* {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Current Location"
            pinColor="blue"
          />
        )} */}
        {selectedLocation && (
          <Marker
            coordinate={selectedLocation}
            title="Selected Location"
            pinColor="red"
          />
        )}
        {otherLocations.map((location, index) => (
          <Marker
            key={`${location.timestamp}-${index}`}
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title={`Other User's Location`}
            description={`Updated: ${new Date(location.timestamp).toLocaleTimeString()}`}
            pinColor="green"
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
    color: '#666',
  },
  button: {
    marginTop: 10,
    paddingHorizontal: 16,
  },
});
