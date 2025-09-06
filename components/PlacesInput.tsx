import Constants from 'expo-constants';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const API_KEY = Constants.expoConfig?.extra?.googleMapApiKey;

type PlacesInputProps = {
  onPlaceSelected: (data: any, details: any) => void;
};

type PlacePrediction = {
  description: string;
  place_id: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
};

export default function PlacesInput({ onPlaceSelected }: PlacesInputProps) {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isPlaceSelected, setIsPlaceSelected] = useState(false);
  const textInputRef = useRef<TextInput>(null);

  const searchPlaces = async (searchText: string) => {
    if (searchText.length < 3) {
      setPredictions([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          searchText
        )}&key=${API_KEY}&language=en`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.predictions) {
        setPredictions(data.predictions);
        setShowResults(true);
      } else {
        setPredictions([]);
        setShowResults(false);
        console.warn('Google Places API error:', data.status, data.error_message);
      }
    } catch (error) {
      console.warn('Error fetching places:', error);
      setPredictions([]);
      setShowResults(false);
    } finally {
      setLoading(false);
    }
  };

  const getPlaceDetails = async (placeId: string) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${API_KEY}&fields=name,geometry,formatted_address`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.result) {
        return data.result;
      }
      return null;
    } catch (error) {
      console.warn('Error fetching place details:', error);
      return null;
    }
  };

  const hideResults = () => {
    setShowResults(false);
    setPredictions([]);
    textInputRef.current?.blur();
  };

  const handlePlaceSelect = async (prediction: PlacePrediction) => {
    hideResults();
    setQuery(prediction.description);
    setIsPlaceSelected(true);

    const details = await getPlaceDetails(prediction.place_id);
    
    onPlaceSelected(
      {
        description: prediction.description,
        place_id: prediction.place_id,
        structured_formatting: prediction.structured_formatting,
      },
      details
    );
  };

  useEffect(() => {
    if (query.length === 0 || isPlaceSelected) {
      setPredictions([]);
      setShowResults(false);
      if (isPlaceSelected) {
        setIsPlaceSelected(false);
      }
      return;
    }

    const timeoutId = setTimeout(() => {
      searchPlaces(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, isPlaceSelected]);

  const renderPrediction = (item: PlacePrediction, index: number) => (
    <TouchableOpacity
      key={item.place_id}
      style={[
        styles.predictionItem,
        index === predictions.length - 1 && styles.lastPredictionItem
      ]}
      onPress={() => handlePlaceSelect(item)}
    >
      <Text style={styles.mainText}>{item.structured_formatting.main_text}</Text>
      <Text style={styles.secondaryText}>{item.structured_formatting.secondary_text}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          ref={textInputRef}
          style={styles.textInput}
          placeholder="Enter location or use current"
          placeholderTextColor="#aaa"
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setIsPlaceSelected(false);
          }}
          onFocus={() => {
            if (predictions.length > 0 && !isPlaceSelected) {
              setShowResults(true);
            }
          }}
          onBlur={hideResults}
          autoCorrect={false}
          autoComplete="off"
        />
        {loading && (
          <ActivityIndicator 
            size="small" 
            color="#3af" 
            style={styles.loadingIndicator}
          />
        )}
      </View>
      
      {showResults && predictions.length > 0 && (
        <>
          <TouchableOpacity 
            style={styles.backdrop}
            onPress={hideResults}
            activeOpacity={1}
          />
          <View style={styles.overlay}>
            <View style={styles.resultsContainer}>
              <View style={styles.resultsList}>
                {predictions.map((item, index) => renderPrediction(item, index))}
              </View>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 16,
    paddingHorizontal: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#222',
    color: '#fff',
    borderRadius: 16,
    fontSize: 16,
    padding: 10,
    minHeight: 44,
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: -9999,
    right: -9999,
    bottom: -9999,
    zIndex: 1500,
    backgroundColor: 'transparent',
  },
  overlay: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 2000,
    elevation: 5,
  },
  resultsContainer: {
    backgroundColor: '#222',
    borderRadius: 16,
    marginTop: 2,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  resultsList: {
    maxHeight: 300,
  },
  predictionItem: {
    padding: 13,
    borderBottomWidth: 0.5,
    borderBottomColor: '#444',
  },
  lastPredictionItem: {
    borderBottomWidth: 0,
  },
  mainText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  secondaryText: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 2,
  },
});
