import { supabase } from '@/lib/supabase';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal, ActivityIndicator } from 'react-native';
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
	const [isLoadingLocation, setIsLoadingLocation] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

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

			// Launch image picker with compression
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
				allowsMultipleSelection: false,
				quality: 0.3, // Reduced quality for smaller file size
				allowsEditing: true,
				aspect: [1, 1],
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
		if (isLoadingLocation) return; // Prevent multiple simultaneous requests
		
		try {
			setIsLoadingLocation(true);
			
			// Request permission
			const { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== 'granted') {
				Alert.alert('Permission needed', 'Please allow location access to use current location');
				return;
			}

			// Get current position with optimized settings for speed
			const position = await Location.getCurrentPositionAsync({
				accuracy: Location.Accuracy.Balanced, // Changed from High to Balanced for speed
			});

			const { latitude: lat, longitude: lng } = position.coords;
			setLatitude(lat);
			setLongitude(lng);

			// Set coordinates as location (faster than reverse geocoding)
			setLocation(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);

			// Optional: Get address in background (non-blocking)
			setTimeout(async () => {
				try {
					const reverseGeocode = await Location.reverseGeocodeAsync({
						latitude: lat,
						longitude: lng,
					});

					if (reverseGeocode.length > 0) {
						const address = reverseGeocode[0];
						const formattedAddress = `${address.street || ''} ${address.city || ''} ${address.region || ''} ${address.country || ''}`.trim();
						if (formattedAddress) {
							setLocation(formattedAddress);
						}
					}
				} catch (error) {
					console.log('Reverse geocoding failed, keeping coordinates');
				}
			}, 100);

		} catch (error) {
			console.error('Location error:', error);
			Alert.alert('Error', 'Failed to get current location. Please check GPS settings.');
		} finally {
			setIsLoadingLocation(false);
		}
	};

	const convertImageToBase64 = async (imageUri: string): Promise<string | null> => {
		try {
			// Get file info first to check size
			const fileInfo = await FileSystem.getInfoAsync(imageUri);
			
			if (fileInfo.exists && fileInfo.size) {
				// Check if file is too large (limit to 5MB)
				const maxSize = 5 * 1024 * 1024; // 5MB
				if (fileInfo.size > maxSize) {
					console.log(`Image too large: ${fileInfo.size} bytes`);
					Alert.alert('Error', 'Image is too large. Please select a smaller image.');
					return null;
				}
			}

			const base64 = await FileSystem.readAsStringAsync(imageUri, {
				encoding: FileSystem.EncodingType.Base64,
			});

			// Check base64 string size (should be roughly 1.33x file size)
			const base64Size = base64.length * 0.75; // Approximate bytes
			if (base64Size > 5 * 1024 * 1024) {
				console.log(`Base64 too large: ${base64Size} bytes`);
				Alert.alert('Error', 'Processed image is too large.');
				return null;
			}

			console.log(`Base64 conversion successful: ${base64Size} bytes`);
			return base64;
		} catch (error) {
			console.error('Base64 conversion error:', error);
			return null;
		}
	};

	const handleSubmitReport = async () => {
		if (isSubmitting) return; // Prevent multiple submissions
		
		if (!latitude || !longitude) {
			Alert.alert('Error', 'Please set your location before submitting');
			return;
		}

		try {
			setIsSubmitting(true);
			
			// Convert image to base64 if selected
			let imageBase64 = null;
			if (selectedImage) {
				imageBase64 = await convertImageToBase64(selectedImage);
				if (!imageBase64) {
					// Ask user if they want to proceed without image
					Alert.alert(
						'Image Error', 
						'Failed to process image. Submit report without image?',
						[
							{ text: 'Cancel', style: 'cancel', onPress: () => setIsSubmitting(false) },
							{ text: 'Submit without image', onPress: () => submitReport(null) }
						]
					);
					return;
				}
			}

			await submitReport(imageBase64);

		} catch (error) {
			console.error('Submit error:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
			Alert.alert('Error', `Failed to submit report: ${errorMessage}`);
		} finally {
			setIsSubmitting(false);
		}
	};

	const submitReport = async (imageBase64: string | null) => {
		try {
			// Prepare report data with minimal payload
			const reportData = {
				latitude: latitude,
				longitude: longitude,
				...(imageBase64 && { image: imageBase64 })
			};

			// Check total payload size
			const payloadString = JSON.stringify(reportData);
			const payloadSize = new Blob([payloadString]).size;
			console.log(`Payload size: ${payloadSize} bytes`);

			if (payloadSize > 10 * 1024 * 1024) { // 10MB limit
				throw new Error('Report data too large. Please try with a smaller image.');
			}

			console.log('Submitting report:', {
				latitude,
				longitude,
				hasImage: !!imageBase64,
				imageSize: imageBase64 ? imageBase64.length : 0,
				totalPayloadSize: payloadSize
			});

			// Use HTTP as fallback if HTTPS fails
			let apiUrl = 'https://troddit.ice.computer/report';
			let response;
			
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

				response = await fetch(apiUrl, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Accept': 'application/json',
					},
					body: payloadString,
					signal: controller.signal,
				});

				clearTimeout(timeoutId);
			} catch (httpsError) {
				console.log('HTTPS failed, trying HTTP fallback:', httpsError);
				
				// Fallback to HTTP
				apiUrl = 'http://152.53.107.10:7504/report';
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 30000);

				response = await fetch(apiUrl, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Accept': 'application/json',
					},
					body: payloadString,
					signal: controller.signal,
				});

				clearTimeout(timeoutId);
			}

			// Check if response is OK before parsing JSON
			if (!response.ok) {
				const errorText = await response.text();
				console.error('API Error Response:', errorText);
				throw new Error(`Server error: ${response.status} - ${errorText}`);
			}

			// Try to parse JSON response
			let responseData;
			try {
				const responseText = await response.text();
				console.log('Raw response:', responseText);
				responseData = JSON.parse(responseText);
			} catch (jsonError) {
				console.error('JSON Parse Error:', jsonError);
				throw new Error('Invalid response from server. Please try again.');
			}

			console.log('API Response:', responseData);

			Alert.alert('Success', 'Incident reported successfully!');
			// Reset form
			setDescription('');
			setLocation('');
			setLatitude(null);
			setLongitude(null);
			setSelectedType(null);
			setSelectedImage(null);

		} catch (error) {
			console.error('Submit report error:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
			
			if (error instanceof Error) {
				if (error.name === 'AbortError') {
					throw new Error('Request timed out. Please try again.');
				} else if (error.message.includes('Network request failed')) {
					throw new Error('Network error. Please check your connection.');
				}
			}
			
			throw error;
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
					<TouchableOpacity 
						style={[styles.currentLocationBtn, isLoadingLocation && styles.currentLocationBtnLoading]} 
						onPress={getCurrentLocation}
						disabled={isLoadingLocation}
					>
						{isLoadingLocation ? (
							<ActivityIndicator size={20} color="#fff" />
						) : (
							<Ionicons name="location" size={20} color="#fff" />
						)}
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
			
			<TouchableOpacity 
				style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]} 
				onPress={handleSubmitReport}
				disabled={isSubmitting}
			>
				{isSubmitting ? (
					<ActivityIndicator size="small" color="#111" />
				) : (
					<Text style={styles.submitBtnText}>Submit Report</Text>
				)}
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
    currentLocationBtnLoading: {
        backgroundColor: '#555',
    },
    submitBtnDisabled: {
        backgroundColor: '#666',
        opacity: 0.7,
    },
});
