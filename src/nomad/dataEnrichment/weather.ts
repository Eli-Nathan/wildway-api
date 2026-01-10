import axios from "axios";

interface WeatherForecastCity {
  name: string;
  coord: {
    lat: number;
    lon: number;
  };
  country: string;
}

interface WeatherForecastItem {
  dt: number;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  clouds: {
    all: number;
  };
  wind: {
    speed: number;
    deg: number;
  };
  dt_txt: string;
}

interface WeatherForecastResponse {
  city: WeatherForecastCity;
  list: WeatherForecastItem[];
}

interface GetWeatherParams {
  lat: number;
  lng: number;
}

interface WeatherResult {
  weatherLocation: string;
  weather: WeatherForecastItem[];
}

export const getWeather = async ({
  lat,
  lng,
}: GetWeatherParams): Promise<WeatherResult | undefined> => {
  const weather = await axios.get<WeatherForecastResponse>(
    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&exclude=minutely&appid=${process.env.WEATHER_API_KEY}`
  );
  const weatherData = weather?.data;
  if (weatherData) {
    return {
      weatherLocation: weatherData.city.name,
      weather: weatherData.list,
    };
  }
  return undefined;
};
