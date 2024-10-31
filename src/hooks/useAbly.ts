import { useEffect, useCallback, useState } from 'react';
import * as Ably from 'ably';
import type { Message } from 'ably';

const ABLY_API_KEY = 'mNSUXw.jMHa6w:ppRq5jm5mbqkNeqdrlTKDTJpODqMOmt5VUb7g73zAGc';
const CHANNEL_NAME = 'ride_01';

interface Location {
  latitude: number;
  longitude: number;
}

interface LocationData {
  latitude: number;
  longitude: number;
  timestamp: string;
}

export function useAbly() {
  const [ably] = useState(new Ably.Realtime({
    key: ABLY_API_KEY,
    echoMessages: false,
  }));

  const [otherLocations, setOtherLocations] = useState<LocationData[]>([]);

  useEffect(() => {
    const channel = ably.channels.get(CHANNEL_NAME);

    // channel.subscribe('location', (message: Message) => {
    //   const locationData = message.data as LocationData;
    //   setOtherLocations(prev => [...prev, locationData]);
    // });

    ably.connection.on('connected', () => {
      console.log('Connected to Ably');
    });

    ably.connection.on('failed', () => {
      console.error('Failed to connect to Ably');
    });

    return () => {
      channel.unsubscribe();
      ably.connection.off();
      ably.close();
    };
  }, [ably]);

  const publishLocation = useCallback((location: Location) => {
    try {
      const channel = ably.channels.get(CHANNEL_NAME);
      const locationData: LocationData = {
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: new Date().toISOString(),
      };
      
      console.log('📍 Attempting to publish location:', locationData);
      
      channel.publish('location', locationData);
    } catch (error) {
      console.error('❌ Error publishing location:', error);
    }
  }, [ably]);

  return { publishLocation, otherLocations };
}
