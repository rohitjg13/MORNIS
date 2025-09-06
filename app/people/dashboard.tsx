import { supabase } from '@/lib/supabase';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import PlacesInput from '../../components/PlacesInput';

const garbageTypes = [
	{ label: 'Hazardous' },
	{ label: 'Recyclable' },
	{ label: 'General' },
	{ label: 'Organic' },
];

export default function PeopleDashboard() {
	const [description, setDescription] = useState('');
	const [location, setLocation] = useState('');
	const [latitude, setLatitude] = useState<number | null>(null);
	const [longitude, setLongitude] = useState<number | null>(null);
	const [selectedType, setSelectedType] = useState<number | null>(null);
	const [selectedImage, setSelectedImage] = useState<string | null>(null);

	const handleSignOut = async () => {
		try {
			await supabase.auth.signOut();
			await AsyncStorage.removeItem('userType');
			router.replace('/login');
		} catch (error) {
			console.error('Sign out error:', error);
			Alert.alert('Error', 'Failed to sign out');
		}
	};

	const pickImage = async () => {
		try {
			// Request permission
			const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
			if (status !== 'granted') {
				Alert.alert('Permission needed', 'Please allow access to photo library to upload images');
				return;
			}

			// Launch image picker
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
				allowsMultipleSelection: false, // Only allow 1 image
				quality: 0.8,
			});

			if (!result.canceled && result.assets && result.assets[0]) {
				setSelectedImage(result.assets[0].uri);
			}
		} catch (error) {
			console.error('Image picker error:', error);
			Alert.alert('Error', 'Failed to pick image');
		}
	};

	const removeImage = () => {
		setSelectedImage(null);
	};

	const getCurrentLocation = async () => {
		try {
			// Request permission
			const { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== 'granted') {
				Alert.alert('Permission needed', 'Please allow location access to use current location');
				return;
			}

			// Get current position
			Alert.alert('Getting Location', 'Please wait while we get your current location...');
			const position = await Location.getCurrentPositionAsync({
				accuracy: Location.Accuracy.High,
			});

			const { latitude: lat, longitude: lng } = position.coords;
			setLatitude(lat);
			setLongitude(lng);

			// Get address from coordinates using reverse geocoding
			const reverseGeocode = await Location.reverseGeocodeAsync({
				latitude: lat,
				longitude: lng,
			});

			if (reverseGeocode.length > 0) {
				const address = reverseGeocode[0];
				const formattedAddress = `${address.street || ''} ${address.city || ''} ${address.region || ''} ${address.country || ''}`.trim();
				setLocation(formattedAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
			} else {
				setLocation(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
			}

			Alert.alert('Success', 'Current location detected!');
		} catch (error) {
			console.error('Location error:', error);
			Alert.alert('Error', 'Failed to get current location');
		}
	};

	const convertImageToBase64 = async (imageUri: string): Promise<string | null> => {
		try {
			const base64 = await FileSystem.readAsStringAsync(imageUri, {
				encoding: FileSystem.EncodingType.Base64,
			});
			return base64;
		} catch (error) {
			console.error('Base64 conversion error:', error);
			return null;
		}
	};

	const handleSubmitReport = async () => {
		if (!location || selectedType === null || latitude === null || longitude === null) {
			Alert.alert('Error', 'Please fill in location and garbage type');
			return;
		}

		try {
			// Get current user
			const { data: { user } } = await supabase.auth.getUser();
			
			// Convert image to base64 if selected
			let imageBase64 = null;
			if (selectedImage) {
				imageBase64 = await convertImageToBase64(selectedImage);
				if (!imageBase64) {
					Alert.alert('Error', 'Failed to process image');
					return;
				}
			}

			// Prepare report data
			const reportData = {
				description,
				location,
				latitude,
				longitude,
				garbage_type: garbageTypes[selectedType].label,
				user_id: user?.id,
				image: imageBase64,
				timestamp: new Date().toISOString(),
			};

			// Log the data being sent (remove in production)
			console.log('Sending report data:', {
				...reportData,
				image: imageBase64 ? `[Base64 image data - ${imageBase64.length} characters]` : null
			});

			const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(reportData),
			});

			if (response.ok) {
				Alert.alert('Success', 'Incident reported successfully!');
				// Reset form
				setDescription('');
				setLocation('');
				setLatitude(null);
				setLongitude(null);
				setSelectedType(null);
				setSelectedImage(null);
			} else {
				throw new Error('API request failed');
			}
		} catch (error) {
			console.error('Submit error:', error);
			Alert.alert('Error', 'Failed to submit report');
		}
	};

	return (
		<View style={{ flex: 1, backgroundColor: '#111', paddingTop: 40 }}>
			<ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
				<View style={styles.headerContainer}>
					<Text style={styles.header}>Report Incident</Text>
					<TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
						<Ionicons name="log-out-outline" size={24} color="#ff0" />
					</TouchableOpacity>
				</View>

				<Text style={styles.label}>Description</Text>
				<View style={styles.inputContainer}>
					<View style={styles.textIcon}><MaterialIcons name="text-fields" size={18} color="#3af" /></View>
					<TextInput
						style={styles.textInput}
						placeholder="Describe the incident (optional)..."
						placeholderTextColor="#aaa"
						value={description}
						onChangeText={setDescription}
						multiline
					/>
				</View>

				<Text style={styles.label}>Add Photo</Text>
				{selectedImage ? (
					<View style={styles.selectedImageContainer}>
						<Image source={{ uri: selectedImage }} style={styles.selectedImageFull} />
						<TouchableOpacity 
							style={styles.removeImageButton}
							onPress={removeImage}
						>
							<Ionicons name="close-circle" size={24} color="#ff4444" />
						</TouchableOpacity>
					</View>
				) : (
					<TouchableOpacity style={styles.photoUpload} onPress={pickImage}>
						<Image
							source={require('../../assets/images/placeholder.png')}
							style={styles.photoBg}
							resizeMode="cover"
							blurRadius={2}
						/>
						<View style={styles.photoOverlay}>
							<Ionicons name="camera" size={36} color="#fff" />
							<Text style={styles.photoText}>Upload Photo</Text>
						</View>
					</TouchableOpacity>
				)}

				<Text style={styles.label}>Location</Text>
				<View style={styles.locationContainer}>
					<View style={styles.locationInputWrapper}>
						<PlacesInput
							onPlaceSelected={(data, details) => {
								setLocation(data.description);
								if (details && details.geometry && details.geometry.location) {
									setLatitude(details.geometry.location.lat);
									setLongitude(details.geometry.location.lng);
								}
							}}
						/>
					</View>
					<TouchableOpacity style={styles.currentLocationBtn} onPress={getCurrentLocation}>
						<Ionicons name="location" size={20} color="#fff" />
					</TouchableOpacity>
				</View>
				{latitude !== null && longitude !== null && (
					<Text style={styles.coordinatesText}>
						📍 Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
					</Text>
				)}

				{/* <Text style={styles.label}>Type of Garbage</Text>
				<View style={styles.garbageTypeRow}>
					{garbageTypes.map((type, idx) => (
						<TouchableOpacity
							key={type.label}
							style={[
								styles.garbageTypeBtn,
								selectedType === idx && styles.garbageTypeBtnSelected,
							]}
							onPress={() => setSelectedType(idx)}
						>
							<View style={[
								styles.radio,
								selectedType === idx && styles.radioSelected,
							]} />
							<Text style={[
								styles.garbageTypeText,
								selectedType === idx && styles.garbageTypeTextSelected,
							]}>{type.label}</Text>
						</TouchableOpacity>
					))}
				</View> */}
			</ScrollView>
			
			<TouchableOpacity style={styles.submitBtn} onPress={handleSubmitReport}>
				<Text style={styles.submitBtnText}>Submit Report</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	headerContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 18,
		marginTop: 10,
	},
	header: {
		color: '#fff',
		fontSize: 28,
		fontWeight: 'bold',
	},
	signOutButton: {
		padding: 8,
	},
	label: {
		color: '#fff',
		fontSize: 18,
		fontWeight: '500',
		marginTop: 18,
		marginBottom: 6,
	},
	inputContainer: {
		backgroundColor: '#222',
		borderRadius: 16,
		flexDirection: 'row',
		alignItems: 'flex-start',
		padding: 10,
		marginBottom: 4,
	},
	textIcon: {
		marginRight: 6,
		marginTop: 2,
	},
	textInput: {
		color: '#fff',
		fontSize: 16,
		flex: 1,
		minHeight: 40,
		padding: 0,
	},
	photoUpload: {
		height: 140,
		borderRadius: 18,
		overflow: 'hidden',
		marginBottom: 8,
		marginTop: 2,
		justifyContent: 'center',
		alignItems: 'center',
	},
	photoBg: {
		...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
        opacity: 0.7,
    },
    photoOverlay: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    photoText: {
        color: '#fff',
        fontSize: 20,
        marginTop: 6,
        fontWeight: '500',
    },
    garbageTypeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 6,
        marginBottom: 18,
    },
    garbageTypeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#222',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 18,
        marginBottom: 10,
        width: '47%',
    },
    garbageTypeBtnSelected: {
        backgroundColor: '#333',
        borderColor: '#ff0',
        borderWidth: 2,
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#888',
        marginRight: 10,
        backgroundColor: '#111',
    },
    radioSelected: {
        borderColor: '#ff0',
        backgroundColor: '#222',
    },
    garbageTypeText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '500',
    },
    garbageTypeTextSelected: {
        color: '#ff0',
    },
    submitBtn: {
        backgroundColor: '#ff0',
        borderRadius: 30,
        paddingVertical: 16,
        alignItems: 'center',
        shadowColor: '#ff0',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
        position: 'absolute',
        left: 20,
        right: 20,
        bottom: 20,
        zIndex: 10,
    },
    submitBtnText: {
        color: '#111',
        fontSize: 20,
        fontWeight: 'bold',
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#222',
        paddingVertical: 8,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        justifyContent: 'space-around',
        alignItems: 'center',
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        borderTopWidth: 2,
        borderColor: '#333',
    },
    tabItem: {
        alignItems: 'center',
        flex: 1,
    },
    tabItemActive: {
        // highlight active tab
    },
    tabLabel: {
        color: '#fff',
        fontSize: 13,
        marginTop: 2,
    },
    selectedImagesContainer: {
        marginBottom: 8,
        marginTop: 2,
    },
    selectedImageContainer: {
        position: 'relative',
        marginBottom: 8,
        marginTop: 2,
    },
    selectedImageFull: {
        width: '100%',
        height: 140,
        borderRadius: 18,
        backgroundColor: '#222',
    },
    selectedImage: {
        width: 100,
        height: 100,
        borderRadius: 12,
        backgroundColor: '#222',
    },
    removeImageButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#111',
        borderRadius: 12,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 8,
    },
    locationInputWrapper: {
        flex: 1,
    },
    currentLocationBtn: {
        backgroundColor: '#333',
        borderRadius: 12,
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#555',
    },
    coordinatesText: {
        color: '#3af',
        fontSize: 12,
        marginTop: 4,
        marginBottom: 8,
        fontStyle: 'italic',
    },
});
