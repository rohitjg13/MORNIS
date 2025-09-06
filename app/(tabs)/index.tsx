import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import PlacesInput from '../../components/PlacesInput';
const garbageTypes = [
	{ label: 'Hazardous' },
	{ label: 'Recyclable' },
	{ label: 'General' },
	{ label: 'Organic' },
];

export default function ReportIncidentScreen() {
	const [description, setDescription] = useState('');
	const [location, setLocation] = useState('');
		const [selectedType, setSelectedType] = useState<number | null>(null);

	return (
		<View style={{ flex: 1, backgroundColor: '#111', paddingTop: 40 }}>
			<ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
				<TouchableOpacity style={{ position: 'absolute', left: 20, top: 40, zIndex: 2 }}>
					<Ionicons name="arrow-back" size={28} color="#fff" />
				</TouchableOpacity>
				<Text style={styles.header}>Report Incident</Text>

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

				<Text style={styles.label}>Add Photos</Text>
				<TouchableOpacity style={styles.photoUpload}>
					<Image
						source={require('../../assets/images/partial-react-logo.png')}
						style={styles.photoBg}
						resizeMode="cover"
						blurRadius={2}
					/>
					<View style={styles.photoOverlay}>
						<Ionicons name="camera" size={36} color="#fff" />
						<Text style={styles.photoText}>Upload Photo</Text>
					</View>
				</TouchableOpacity>

				<Text style={styles.label}>Location</Text>
						<View style={{ marginBottom: 4 }}>
						  <PlacesInput
						    onPlaceSelected={(data, details) => {
						      setLocation(data.description);
						    }}
						  />
						</View>

				<Text style={styles.label}>Type of Garbage</Text>
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
				</View>

				<TouchableOpacity style={styles.submitBtn}>
					<Text style={styles.submitBtnText}>Submit Report</Text>
				</TouchableOpacity>
			</ScrollView>

			<View style={styles.tabBar}>
				<TouchableOpacity style={styles.tabItem}>
					<Ionicons name="home" size={24} color="#fff" />
					<Text style={styles.tabLabel}>Dashboard</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.tabItem}>
					<MaterialIcons name="volunteer-activism" size={24} color="#fff" />
					<Text style={styles.tabLabel}>Volunteer</Text>
				</TouchableOpacity>
				<TouchableOpacity style={[styles.tabItem, styles.tabItemActive]}>
					<Ionicons name="alert-circle" size={28} color="#ff0" />
					<Text style={[styles.tabLabel, { color: '#ff0' }]}>Report</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.tabItem}>
					<Ionicons name="person" size={24} color="#fff" />
					<Text style={styles.tabLabel}>Profile</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	header: {
		color: '#fff',
		fontSize: 28,
		fontWeight: 'bold',
		alignSelf: 'center',
		marginBottom: 18,
		marginTop: 10,
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
	locationIcon: {
		marginLeft: 8,
		marginTop: 2,
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
		marginTop: 10,
		marginBottom: 30,
		shadowColor: '#ff0',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 6,
		elevation: 4,
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

  },
	tabLabel: {
		color: '#fff',
		fontSize: 13,
		marginTop: 2,
	},
});
