import { tool } from 'ai';
import { z } from 'zod';

async function geocodeLocation(location: string) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        location,
      )}`,
      {
        headers: {
          'User-Agent': 'Deep-Chat/1.0',
        },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to geocode location');
    }

    const data = await response.json();
    if (data.length === 0) {
      throw new Error('Location not found');
    }

    return {
      latitude: Number.parseFloat(data[0].lat),
      longitude: Number.parseFloat(data[0].lon),
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
}

export const getWeather = tool({
  description: 'Get the current weather at a location',
  parameters: z.object({
    location: z
      .string()
      .describe(
        'The location to get weather for (e.g., "San Francisco" or "London, UK")',
      ),
  }),
  execute: async ({ location }) => {
    // First, geocode the location to get coordinates
    const { latitude, longitude } = await geocodeLocation(location);

    // Then fetch weather data
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
    );

    const weatherData = await response.json();
    return weatherData;
  },
});
