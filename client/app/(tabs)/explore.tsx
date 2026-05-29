import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabTwoScreen() {
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const mapRef = useRef<MapView>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let isMounted = true;

    const loadLocation = async () => {
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          return;
        }

        const permissions = await Location.getForegroundPermissionsAsync();
        const nextPermissions = permissions.status === 'granted'
          ? permissions
          : await Location.requestForegroundPermissionsAsync();

        if (!isMounted || nextPermissions.status !== 'granted') {
          return;
        }

        const position = await Location.getCurrentPositionAsync({});

        if (isMounted) {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        }
      } catch {
        return;
      }
    };

    void loadLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.screen}>
      {currentLocation ? (
        <>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            provider={PROVIDER_GOOGLE}
            userInterfaceStyle="dark"
            customMapStyle={darkMapStyle}
            initialRegion={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            showsUserLocation={true}
            showsMyLocationButton={false}
            zoomEnabled={true}
            scrollEnabled={true}
          >
            {/* Mock Safe Zone Marker */}
            <Marker coordinate={{ latitude: currentLocation.latitude + 0.003, longitude: currentLocation.longitude + 0.003 }}>
              <View style={[styles.markerContainer, { backgroundColor: '#4CAF50' }]}>
                <MaterialCommunityIcons name="shield-check" size={18} color="#FFF" />
              </View>
            </Marker>

            {/* Mock Police Station Marker */}
            <Marker coordinate={{ latitude: currentLocation.latitude - 0.005, longitude: currentLocation.longitude + 0.004 }}>
              <View style={[styles.markerContainer, { backgroundColor: '#2196F3' }]}>
                <MaterialCommunityIcons name="police-badge" size={18} color="#FFF" />
              </View>
            </Marker>

            {/* Mock Hospital Marker */}
            <Marker coordinate={{ latitude: currentLocation.latitude + 0.002, longitude: currentLocation.longitude - 0.006 }}>
              <View style={[styles.markerContainer, { backgroundColor: '#E53935' }]}>
                <MaterialCommunityIcons name="hospital-box" size={18} color="#FFF" />
              </View>
            </Marker>
          </MapView>

          {/* Top Search Bar */}
          <View style={[styles.topBar, { top: Math.max(insets.top + 10, 20) }]}>
            <View style={styles.searchBox}>
              <MaterialCommunityIcons name="magnify" size={22} color="#8F8A8D" />
              <TextInput 
                style={styles.searchInput}
                placeholder="Find safe spaces nearby..."
                placeholderTextColor="#8F8A8D"
              />
              <Pressable style={styles.filterButton}>
                <MaterialCommunityIcons name="tune" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          {/* Bottom Floating Actions */}
          <View style={[styles.bottomActions, { bottom: Math.max(insets.bottom + 20, 20) }]}>
            <View style={styles.sideButtons}>
              <Pressable style={styles.circleButton}>
                <MaterialCommunityIcons name="alert" size={22} color="#FAFAFA" />
              </Pressable>

              <Pressable 
                style={styles.circleButton}
                onPress={() => {
                  mapRef.current?.animateToRegion({
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  });
                }}
              >
                <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#FAFAFA" />
              </Pressable>
            </View>

            <Pressable style={styles.shareLocationBtn}>
              <MaterialCommunityIcons name="share-variant" size={20} color="#FAFAFA" />
              <Text style={styles.shareLocationText}>Share Live Status</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="map-search-outline" size={52} color="#EF4444" />
          <Text style={styles.loadingText}>Loading your area...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#09090B',
    gap: 12,
  },
  loadingText: {
    color: '#A1A1AA',
    fontSize: 16,
    fontWeight: '600',
  },
  topBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 999,
    paddingHorizontal: 16,
    height: 54,
    borderWidth: 1,
    borderColor: '#27272A',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#FAFAFA',
    fontWeight: '500',
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomActions: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 10,
    alignItems: 'flex-end',
    gap: 16,
  },
  sideButtons: {
    gap: 12,
    marginBottom: 4,
  },
  circleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  shareLocationBtn: {
    width: '100%',
    height: 56,
    borderRadius: 999,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  shareLocationText: {
    color: '#FAFAFA',
    fontSize: 16,
    fontWeight: '800',
  },
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#18181B',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
});

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#263c3f' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b9a76' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#38414e' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#212a37' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9ca5b3' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#746855' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f2835' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f3d19c' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2f3948' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#17263c' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#515c6d' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#17263c' }],
  },
];
