import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';

interface LocationInfo {
  timezone: string;
  city: string;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
}

interface LocationDateTimeProps {
  timeFormat?: '12h' | '24h';
  timezone?: string;
}

const LocationDateTime: React.FC<LocationDateTimeProps> = ({ 
  timeFormat = '24h', 
  timezone: settingsTimezone 
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Get location and timezone from IP (only if no timezone is set in settings)
  useEffect(() => {
    // Skip IP detection if user has set a custom timezone
    if (settingsTimezone) {
      setLoading(false);
      return;
    }

    const fetchLocationInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Try multiple services for better reliability
        const services = [
          'https://ipapi.co/json/',
          'https://api.ipify.org?format=json', // Fallback that only gives IP
        ];
        
        let locationData = null;
        
        for (const serviceUrl of services) {
          try {
            const response = await fetch(serviceUrl);
            
            if (!response.ok) continue;
            
            const data = await response.json();
            
            if (serviceUrl.includes('ipapi.co')) {
              if (data.error) continue;
              
              locationData = {
                timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                city: data.city || 'Unknown',
                country: data.country_name || 'Unknown', 
                countryCode: data.country_code || 'XX',
                lat: data.latitude || 0,
                lon: data.longitude || 0
              };
              break;
            }
          } catch (serviceError) {
            console.warn(`Service ${serviceUrl} failed:`, serviceError);
            continue;
          }
        }
        
        if (locationData) {
          setLocationInfo(locationData);
        } else {
          throw new Error('All location services failed');
        }
        
      } catch (err) {
        console.error('Failed to fetch location:', err);
        setError('Unable to detect location');
        
        // Fallback to system timezone
        setLocationInfo({
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          city: 'Local',
          country: 'System',
          countryCode: 'SYS',
          lat: 0,
          lon: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLocationInfo();
  }, [settingsTimezone]);

  const formatDate = (date: Date, timezone: string) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: timezone
    }).format(date);
  };

  const formatTime = (date: Date, timezone: string) => {
    const hour12 = timeFormat === '12h';
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: timezone,
      hour12: hour12
    }).format(date);
  };

  const getLocationDisplay = () => {
    if (settingsTimezone) {
      // If user has set a custom timezone, show that instead of IP location
      const parts = settingsTimezone.split('/');
      return parts[parts.length - 1]?.replace('_', ' ') || settingsTimezone;
    }
    
    if (loading) return 'Detecting location...';
    if (error) return 'Local Time';
    if (!locationInfo) return 'Unknown Location';
    
    return `${locationInfo.city}, ${locationInfo.countryCode}`;
  };

  // Use settings timezone if provided, otherwise use detected timezone
  const effectiveTimezone = settingsTimezone || locationInfo?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="bg-background border-b border-border/20 px-3 py-1 flex-shrink-0">
      <div className="flex items-center justify-between">
        {/* Date Section */}
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-primary/10 flex items-center justify-center">
            <Calendar className="text-primary" size={10} />
          </div>
          <div>
            <div className="text-xs font-medium text-foreground leading-tight">
              {formatDate(currentTime, effectiveTimezone)}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 leading-tight">
              <MapPin size={8} />
              {getLocationDisplay()}
            </div>
          </div>
        </div>

        {/* Time Section */}
        <div className="flex items-center gap-1.5">
          <div>
            <div className="text-sm font-mono font-bold text-foreground text-right leading-tight">
              {formatTime(currentTime, effectiveTimezone)}
            </div>
            <div className="text-xs text-muted-foreground text-right leading-tight">
              {loading ? 'UTC' : effectiveTimezone.split('/')[1]?.replace('_', ' ') || 'Local'}
            </div>
          </div>
          <div className="w-4 h-4 rounded bg-primary/10 flex items-center justify-center">
            <Clock className="text-primary" size={10} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationDateTime;
