import { supabase } from '@/lib/supabase';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const routeData = [
	{ id: 1, area: 'Downtown District', status: 'Pending', houses: 24, collected: 18 },
	{ id: 2, area: 'Residential Zone A', status: 'In Progress', houses: 32, collected: 8 },
	{ id: 3, area: 'Industrial Area', status: 'Completed', houses: 16, collected: 16 },
	{ id: 4, area: 'Suburb Heights', status: 'Pending', houses: 28, collected: 0 },
];

export default function DriverDashboard() {
	const [selectedRoute, setSelectedRoute] = useState<number | null>(null);

	const handleSignOut = async () => {
		try {
			await supabase.auth.signOut();
			await AsyncStorage.removeItem('userType');
			router.replace('/login');
		} catch (error) {
			Alert.alert('Error', 'Failed to sign out');
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'Completed':
				return '#4CAF50';
			case 'In Progress':
				return '#ff0';
			case 'Pending':
				return '#FF9800';
			default:
				return '#666';
		}
	};

	const handleRouteAction = (routeId: number, action: 'start' | 'complete') => {

        Alert.alert('Success', `Route ${action === 'start' ? 'started' : 'completed'} successfully!`);
	};

	return (
		<View style={{ flex: 1, backgroundColor: '#111', paddingTop: 40 }}>
			<ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
				<View style={styles.headerContainer}>
					<Text style={styles.header}>Driver Dashboard</Text>
					<TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
						<Ionicons name="log-out-outline" size={24} color="#ff0" />
					</TouchableOpacity>
				</View>

				<View style={styles.statsContainer}>
					<View style={styles.statCard}>
						<Text style={styles.statNumber}>4</Text>
						<Text style={styles.statLabel}>Total Routes</Text>
					</View>
					<View style={styles.statCard}>
						<Text style={styles.statNumber}>1</Text>
						<Text style={styles.statLabel}>Completed</Text>
					</View>
					<View style={styles.statCard}>
						<Text style={styles.statNumber}>42</Text>
						<Text style={styles.statLabel}>Houses Left</Text>
					</View>
				</View>

				<Text style={styles.sectionTitle}>Today's Routes</Text>

				{routeData.map((route) => (
					<View key={route.id} style={styles.routeCard}>
						<View style={styles.routeHeader}>
							<Text style={styles.routeArea}>{route.area}</Text>
							<View style={[styles.statusBadge, { backgroundColor: getStatusColor(route.status) }]}>
								<Text style={styles.statusText}>{route.status}</Text>
							</View>
						</View>

						<View style={styles.routeStats}>
							<View style={styles.routeStat}>
								<Ionicons name="home-outline" size={16} color="#aaa" />
								<Text style={styles.routeStatText}>{route.houses} Houses</Text>
							</View>
							<View style={styles.routeStat}>
								<Ionicons name="checkmark-circle-outline" size={16} color="#aaa" />
								<Text style={styles.routeStatText}>{route.collected} Collected</Text>
							</View>
						</View>

						<View style={styles.progressContainer}>
							<View style={styles.progressBar}>
								<View 
									style={[
										styles.progressFill, 
										{ width: `${(route.collected / route.houses) * 100}%` }
									]} 
								/>
							</View>
							<Text style={styles.progressText}>
								{Math.round((route.collected / route.houses) * 100)}%
							</Text>
						</View>

						<View style={styles.routeActions}>
							{route.status === 'Pending' && (
								<TouchableOpacity 
									style={styles.actionButton}
									onPress={() => handleRouteAction(route.id, 'start')}
								>
									<Text style={styles.actionButtonText}>Start Route</Text>
								</TouchableOpacity>
							)}
							{route.status === 'In Progress' && (
								<TouchableOpacity 
									style={[styles.actionButton, styles.completeButton]}
									onPress={() => handleRouteAction(route.id, 'complete')}
								>
									<Text style={styles.actionButtonText}>Mark Complete</Text>
								</TouchableOpacity>
							)}
							<TouchableOpacity style={styles.viewButton}>
								<Text style={styles.viewButtonText}>View Details</Text>
							</TouchableOpacity>
						</View>
					</View>
				))}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	headerContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 20,
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
	statsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 30,
	},
	statCard: {
		backgroundColor: '#222',
		borderRadius: 16,
		padding: 20,
		alignItems: 'center',
		flex: 1,
		marginHorizontal: 5,
	},
	statNumber: {
		color: '#ff0',
		fontSize: 32,
		fontWeight: 'bold',
	},
	statLabel: {
		color: '#aaa',
		fontSize: 14,
		marginTop: 5,
	},
	sectionTitle: {
		color: '#fff',
		fontSize: 22,
		fontWeight: '600',
		marginBottom: 15,
	},
	routeCard: {
		backgroundColor: '#222',
		borderRadius: 16,
		padding: 20,
		marginBottom: 15,
	},
	routeHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 15,
	},
	routeArea: {
		color: '#fff',
		fontSize: 18,
		fontWeight: '600',
	},
	statusBadge: {
		paddingHorizontal: 12,
		paddingVertical: 4,
		borderRadius: 12,
	},
	statusText: {
		color: '#000',
		fontSize: 12,
		fontWeight: '600',
	},
	routeStats: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 15,
	},
	routeStat: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	routeStatText: {
		color: '#aaa',
		marginLeft: 8,
		fontSize: 14,
	},
	progressContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 15,
	},
	progressBar: {
		flex: 1,
		height: 8,
		backgroundColor: '#333',
		borderRadius: 4,
		marginRight: 10,
	},
	progressFill: {
		height: '100%',
		backgroundColor: '#ff0',
		borderRadius: 4,
	},
	progressText: {
		color: '#fff',
		fontSize: 14,
		fontWeight: '600',
		width: 40,
	},
	routeActions: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	actionButton: {
		backgroundColor: '#ff0',
		borderRadius: 12,
		paddingVertical: 10,
		paddingHorizontal: 20,
		flex: 1,
		marginRight: 10,
	},
	completeButton: {
		backgroundColor: '#4CAF50',
	},
	actionButtonText: {
		color: '#000',
		fontWeight: '600',
		textAlign: 'center',
	},
	viewButton: {
		backgroundColor: '#333',
		borderRadius: 12,
		paddingVertical: 10,
		paddingHorizontal: 20,
		flex: 1,
	},
	viewButtonText: {
		color: '#fff',
		fontWeight: '600',
		textAlign: 'center',
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
});
