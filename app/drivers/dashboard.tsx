import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const routeData = [
	{ id: 1, area: 'Downtown District', status: 'Pending', stops: 24 },
	{ id: 2, area: 'Residential Zone A', status: 'In Progress', stops: 32 },
	{ id: 3, area: 'Industrial Area', status: 'Completed', stops: 16 },
	{ id: 4, area: 'Suburb Heights', status: 'Pending', stops: 28 },
];

interface RouteStep {
	step: number;
	start: string;
	end: string;
	distance: string;
	duration: string;
}

interface OptimizedRoute {
	status: string;
	route_text: RouteStep[];
	maps_url: string;
}

export default function DriverDashboard() {
	const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
	const [showRouteModal, setShowRouteModal] = useState(false);
	const [routeStatuses, setRouteStatuses] = useState<{[key: number]: string}>({});

	useEffect(() => {
		loadRouteStatuses();
	}, []);

	const loadRouteStatuses = async () => {
		try {
			const savedStatuses = await AsyncStorage.getItem('routeStatuses');
			if (savedStatuses) {
				setRouteStatuses(JSON.parse(savedStatuses));
			}
		} catch (error) {
			console.error('Error loading route statuses:', error);
		}
	};

	const saveRouteStatus = async (routeId: number, status: string) => {
		try {
			const newStatuses = { ...routeStatuses, [routeId]: status };
			setRouteStatuses(newStatuses);
			await AsyncStorage.setItem('routeStatuses', JSON.stringify(newStatuses));
		} catch (error) {
			console.error('Error saving route status:', error);
		}
	};

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

	const optimizeRoute = async () => {
		try {
			// Replace with your actual backend URL
			const response = await fetch('YOUR_BACKEND_URL/optimize-route', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			});

			if (response.ok) {
				const data: OptimizedRoute = await response.json();
				setOptimizedRoute(data);
				setShowRouteModal(true);
			} else {
				Alert.alert('Error', 'Failed to optimize route');
			}
		} catch (error) {
			// For demo purposes, using mock data
			console.error('Failed to fetch optimized route:', error);
			const mockData: OptimizedRoute = {
				status: 'ok',
				route_text: [
					{
						step: 1,
						start: "67/1, KG Halli, D' Souza Layout, Ashok Nagar, Bengaluru, Karnataka 560001, India",
						end: 'WJPF+3QH, KHB Colony, 4th Block, Koramangala, Bengaluru, Karnataka 560095, India',
						distance: '6.6 km',
						duration: '23 mins'
					},
					{
						step: 2,
						start: 'WJPF+3QH, KHB Colony, 4th Block, Koramangala, Bengaluru, Karnataka 560095, India',
						end: '438, 56th Cross Rd, 3rd Block, Rajajinagar, Bengaluru, Karnataka 560010, India',
						distance: '12.7 km',
						duration: '42 mins'
					},
					{
						step: 3,
						start: '438, 56th Cross Rd, 3rd Block, Rajajinagar, Bengaluru, Karnataka 560010, India',
						end: "67/1, KG Halli, D' Souza Layout, Ashok Nagar, Bengaluru, Karnataka 560001, India",
						distance: '5.6 km',
						duration: '17 mins'
					}
				],
				maps_url: 'https://www.google.com/maps/dir/12.9716,77.5946/12.9352,77.6245/12.986,77.555/12.9716,77.5946'
			};
			setOptimizedRoute(mockData);
			setShowRouteModal(true);
		}
	};

	const openMapsRoute = () => {
		if (optimizedRoute?.maps_url) {
			Linking.openURL(optimizedRoute.maps_url);
		}
	};

	const handleRouteAction = async (routeId: number, action: 'start' | 'complete') => {
		const newStatus = action === 'start' ? 'In Progress' : 'Completed';
		await saveRouteStatus(routeId, newStatus);
		Alert.alert('Success', `Route ${action === 'start' ? 'started' : 'completed'} successfully!`);
	};

	const getRouteStatus = (routeId: number, originalStatus: string) => {
		return routeStatuses[routeId] || originalStatus;
	};

	const completedRoutes = Object.values(routeStatuses).filter(status => status === 'Completed').length;
	const totalStops = routeData.reduce((sum, route) => sum + route.stops, 0);

	return (
		<View style={{ flex: 1, backgroundColor: '#111', paddingTop: 40 }}>
			<ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
				<View style={styles.headerContainer}>
					<Text style={styles.header}>Driver Dashboard</Text>
					<TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
						<Ionicons name="log-out-outline" size={24} color="#ff0" />
					</TouchableOpacity>
				</View>

				<TouchableOpacity style={styles.optimizeButton} onPress={optimizeRoute}>
					<Ionicons name="navigate-outline" size={24} color="#000" />
					<Text style={styles.optimizeButtonText}>Optimize Route</Text>
				</TouchableOpacity>

				<View style={styles.statsContainer}>
					<View style={styles.statCard}>
						<Text style={styles.statNumber}>4</Text>
						<Text style={styles.statLabel}>Total Routes</Text>
					</View>
					<View style={styles.statCard}>
						<Text style={styles.statNumber}>{completedRoutes}</Text>
						<Text style={styles.statLabel}>Completed</Text>
					</View>
					<View style={styles.statCard}>
						<Text style={styles.statNumber}>{totalStops}</Text>
						<Text style={styles.statLabel}>Total Stops</Text>
					</View>
				</View>
{/* 
				<Text style={styles.sectionTitle}>Today&apos;s Routes</Text>

				{routeData.map((route) => {
					const currentStatus = getRouteStatus(route.id, route.status);
					return (
						<View key={route.id} style={styles.routeCard}>
							<View style={styles.routeHeader}>
								<Text style={styles.routeArea}>{route.area}</Text>
								<View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentStatus) }]}>
									<Text style={styles.statusText}>{currentStatus}</Text>
								</View>
							</View>

							<View style={styles.routeStats}>
								<View style={styles.routeStat}>
									<Ionicons name="location-outline" size={16} color="#aaa" />
									<Text style={styles.routeStatText}>{route.stops} Stops</Text>
								</View>
							</View>

							<View style={styles.routeActions}>
								{currentStatus === 'Pending' && (
									<TouchableOpacity 
										style={styles.actionButton}
										onPress={() => handleRouteAction(route.id, 'start')}
									>
										<Text style={styles.actionButtonText}>Start Route</Text>
									</TouchableOpacity>
								)}
								{currentStatus === 'In Progress' && (
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
					);
				})} */}
			</ScrollView>

			<Modal
				visible={showRouteModal}
				animationType="slide"
				presentationStyle="pageSheet"
			>
				<View style={styles.modalContainer}>
					<View style={styles.modalHeader}>
						<Text style={styles.modalTitle}>Optimized Route</Text>
						<TouchableOpacity 
							onPress={() => setShowRouteModal(false)}
							style={styles.closeButton}
						>
							<Ionicons name="close" size={24} color="#fff" />
						</TouchableOpacity>
					</View>

					<ScrollView style={styles.modalContent}>
						{optimizedRoute?.route_text.map((step, index) => (
							<View key={index} style={styles.stepCard}>
								<View style={styles.stepHeader}>
									<Text style={styles.stepNumber}>Step {step.step}</Text>
									<Text style={styles.stepDuration}>{step.duration}</Text>
								</View>
								<Text style={styles.stepStart}>From: {step.start}</Text>
								<Text style={styles.stepEnd}>To: {step.end}</Text>
								<Text style={styles.stepDistance}>Distance: {step.distance}</Text>
							</View>
						))}
					</ScrollView>

					<View style={styles.modalActions}>
						<TouchableOpacity 
							style={styles.takeRouteButton}
							onPress={openMapsRoute}
						>
							<Ionicons name="map" size={20} color="#000" />
							<Text style={styles.takeRouteText}>Take Route</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
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
	optimizeButton: {
		backgroundColor: '#ff0',
		borderRadius: 16,
		padding: 16,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 20,
	},
	optimizeButtonText: {
		color: '#000',
		fontSize: 18,
		fontWeight: '600',
		marginLeft: 8,
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
	modalContainer: {
		flex: 1,
		backgroundColor: '#111',
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 20,
		paddingTop: 60,
		borderBottomWidth: 1,
		borderBottomColor: '#333',
	},
	modalTitle: {
		color: '#fff',
		fontSize: 24,
		fontWeight: 'bold',
	},
	closeButton: {
		padding: 8,
	},
	modalContent: {
		flex: 1,
		padding: 20,
	},
	stepCard: {
		backgroundColor: '#222',
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
	},
	stepHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	stepNumber: {
		color: '#ff0',
		fontSize: 16,
		fontWeight: 'bold',
	},
	stepDuration: {
		color: '#4CAF50',
		fontSize: 14,
		fontWeight: '600',
	},
	stepStart: {
		color: '#fff',
		fontSize: 14,
		marginBottom: 4,
	},
	stepEnd: {
		color: '#fff',
		fontSize: 14,
		marginBottom: 4,
	},
	stepDistance: {
		color: '#aaa',
		fontSize: 12,
	},
	modalActions: {
		padding: 20,
		borderTopWidth: 1,
		borderTopColor: '#333',
	},
	takeRouteButton: {
		backgroundColor: '#ff0',
		borderRadius: 12,
		padding: 16,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	takeRouteText: {
		color: '#000',
		fontSize: 16,
		fontWeight: '600',
		marginLeft: 8,
	},
});
