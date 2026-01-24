import requests
import json
import time
from typing import List, Dict, Set, Optional, Tuple
from dataclasses import dataclass, asdict
from collections import defaultdict
import hashlib
from math import radians, cos, sin, asin, sqrt
from bs4 import BeautifulSoup
import re

# Try to import OSGridConverter, provide helpful error if not installed

try:
from OSGridConverter import grid2latlong
OSGRID_AVAILABLE = True
except ImportError:
OSGRID_AVAILABLE = False
print(“⚠️  OSGridConverter not installed. Install with: pip install OSGridConverter”)
print(”   Without it, hills with only grid references will be skipped.”)

@dataclass
class POI:
“”“Point of Interest data structure”””
id: str
title: str
type: str
lat: float
lng: float
description: str = “”
image_url: str = “”
facilities: List[str] = None
attributes: Dict = None
sources: List[str] = None

```
def __post_init__(self):
    if self.facilities is None:
        self.facilities = []
    if self.attributes is None:
        self.attributes = {}
    if self.sources is None:
        self.sources = []
```

class ScotlandPOIScraper:
“”“Scraper for Scotland Points of Interest”””

```
# Scotland bounding box
SCOTLAND_BBOX = {
    'south': 54.6,
    'north': 60.9,
    'west': -8.7,
    'east': -0.7
}

# OSM query templates
OSM_QUERIES = {
    'campsites': """
        [out:json][timeout:60];
        (
          node["tourism"="camp_site"]({s},{w},{n},{e});
          way["tourism"="camp_site"]({s},{w},{n},{e});
          node["tourism"="caravan_site"]({s},{w},{n},{e});
          way["tourism"="caravan_site"]({s},{w},{n},{e});
        );
        out center;
    """,
    'parking': """
        [out:json][timeout:60];
        (
          node["amenity"="parking"]({s},{w},{n},{e});
          way["amenity"="parking"]({s},{w},{n},{e});
        );
        out center;
    """,
    'mountains': """
        [out:json][timeout:60];
        (
          node["natural"="peak"]({s},{w},{n},{e});
        );
        out;
    """,
    'lochs': """
        [out:json][timeout:60];
        (
          way["natural"="water"]["water"="lake"]({s},{w},{n},{e});
          way["natural"="water"]["water"="loch"]({s},{w},{n},{e});
        );
        out center;
    """,
    'beaches': """
        [out:json][timeout:60];
        (
          node["natural"="beach"]({s},{w},{n},{e});
          way["natural"="beach"]({s},{w},{n},{e});
        );
        out center;
    """,
    'fuel': """
        [out:json][timeout:60];
        (
          node["amenity"="fuel"]({s},{w},{n},{e});
          way["amenity"="fuel"]({s},{w},{n},{e});
        );
        out center;
    """,
    'ev_charging': """
        [out:json][timeout:60];
        (
          node["amenity"="charging_station"]({s},{w},{n},{e});
          way["amenity"="charging_station"]({s},{w},{n},{e});
        );
        out center;
    """,
    'historic': """
        [out:json][timeout:60];
        (
          node["historic"~"castle|monument|ruins|archaeological_site"]({s},{w},{n},{e});
          way["historic"~"castle|monument|ruins|archaeological_site"]({s},{w},{n},{e});
        );
        out center;
    """,
    'viewpoints': """
        [out:json][timeout:60];
        (
          node["tourism"="viewpoint"]({s},{w},{n},{e});
        );
        out;
    """,
}

def __init__(self, zapmap_api_key: Optional[str] = None):
    self.overpass_url = "https://overpass-api.de/api/interpreter"
    self.zapmap_api_key = zapmap_api_key
    self.all_pois: List[POI] = []
    self.session = requests.Session()
    self.session.headers.update({
        'User-Agent': 'ScotlandPOIScraper/1.0 (Educational Project)'
    })
    
def convert_grid_ref_to_coords(self, grid_ref: str) -> Optional[Tuple[float, float]]:
    """
    Convert British National Grid reference to lat/lng
    Returns (lat, lng) or None if conversion fails
    """
    if not OSGRID_AVAILABLE:
        return None
    
    if not grid_ref or len(grid_ref) < 4:
        return None
    
    try:
        # Clean up grid reference
        grid_ref = grid_ref.strip().upper()
        
        # OSGridConverter expects format like "NN166712"
        result = grid2latlong(grid_ref)
        
        if result and len(result) == 2:
            lat, lng = result
            # Verify coordinates are in Scotland
            if (self.SCOTLAND_BBOX['south'] <= lat <= self.SCOTLAND_BBOX['north'] and
                self.SCOTLAND_BBOX['west'] <= lng <= self.SCOTLAND_BBOX['east']):
                return lat, lng
        
        return None
        
    except Exception as e:
        return None
    """Calculate distance between two points in meters"""
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    return c * 6371000  # Earth radius in meters

def normalize_name(self, name: str) -> str:
    """Normalize name for comparison"""
    if not name:
        return ""
    name = name.lower()
    # Remove common prefixes/suffixes
    removals = ['the ', ' loch', ' beach', ' car park', ' parking']
    for r in removals:
        name = name.replace(r, '')
    # Remove punctuation
    name = ''.join(c for c in name if c.isalnum() or c.isspace())
    return ' '.join(name.split())

def levenshtein_distance(self, s1: str, s2: str) -> int:
    """Calculate Levenshtein distance between two strings"""
    if len(s1) < len(s2):
        return self.levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    
    return previous_row[-1]

def query_overpass(self, query: str, category: str) -> List[POI]:
    """Query Overpass API and convert to POI objects"""
    bbox = self.SCOTLAND_BBOX
    formatted_query = query.format(
        s=bbox['south'], 
        n=bbox['north'],
        w=bbox['west'], 
        e=bbox['east']
    )
    
    print(f"Querying {category}...")
    
    try:
        response = self.session.post(
            self.overpass_url,
            data={'data': formatted_query},
            timeout=120
        )
        response.raise_for_status()
        data = response.json()
        
        pois = []
        for element in data.get('elements', []):
            # Get coordinates
            if 'lat' in element and 'lon' in element:
                lat, lng = element['lat'], element['lon']
            elif 'center' in element:
                lat, lng = element['center']['lat'], element['center']['lon']
            else:
                continue
            
            tags = element.get('tags', {})
            name = tags.get('name', tags.get('ref', f"Unnamed {category}"))
            
            # Extract facilities
            facilities = []
            if tags.get('toilets') == 'yes':
                facilities.append('toilets')
            if tags.get('shower') == 'yes':
                facilities.append('showers')
            if tags.get('drinking_water') == 'yes':
                facilities.append('drinking_water')
            if tags.get('fee') == 'yes':
                facilities.append('paid')
            
            # Extract attributes
            attributes = {}
            if 'ele' in tags:
                try:
                    attributes['elevation_m'] = float(tags['ele'])
                except ValueError:
                    pass
            if 'capacity' in tags:
                attributes['capacity'] = tags['capacity']
            if 'opening_hours' in tags:
                attributes['opening_hours'] = tags['opening_hours']
            if 'operator' in tags:
                attributes['operator'] = tags['operator']
            if 'surface' in tags:
                attributes['surface'] = tags['surface']
            
            # Generate unique ID
            poi_id = hashlib.md5(
                f"{lat}{lng}{name}{category}".encode()
            ).hexdigest()[:12]
            
            poi = POI(
                id=poi_id,
                title=name,
                type=category,
                lat=lat,
                lng=lng,
                description=tags.get('description', ''),
                facilities=facilities,
                attributes=attributes,
                sources=['osm']
            )
            pois.append(poi)
        
        print(f"  Found {len(pois)} {category}")
        return pois
        
    except Exception as e:
        print(f"  Error querying {category}: {e}")
        return []

def fetch_dobih_hills(self) -> List[POI]:
    """
    Fetch hill data from Database of British and Irish Hills
    This is the official, free, open database of all UK hills
    Much better than scraping Walkhighlands!
    """
    print("\nFetching hills from Database of British and Irish Hills...")
    
    pois = []
    
    # DoBIH download URLs
    dobih_urls = {
        'munros': 'http://www.hills-database.co.uk/downloads/munros.csv',
        'corbetts': 'http://www.hills-database.co.uk/downloads/corbetts.csv',
        'grahams': 'http://www.hills-database.co.uk/downloads/grahams.csv',
    }
    
    for classification, url in dobih_urls.items():
        try:
            print(f"  Downloading {classification}...")
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            # Parse CSV
            import csv
            import io
            
            csv_file = io.StringIO(response.text)
            reader = csv.DictReader(csv_file)
            
            count = 0
            skipped_no_coords = 0
            
            for row in reader:
                try:
                    # DoBIH format varies, check actual column names
                    name = row.get('Name', row.get('Hill Name', ''))
                    if not name:
                        continue
                    
                    lat = None
                    lng = None
                    
                    # Try to get coordinates - method 1: direct lat/lng
                    lat_str = row.get('Latitude', row.get('Lat', ''))
                    lng_str = row.get('Longitude', row.get('Long', row.get('Lon', '')))
                    
                    if lat_str and lng_str:
                        try:
                            lat = float(lat_str)
                            lng = float(lng_str)
                        except ValueError:
                            pass
                    
                    # Method 2: Convert from grid reference if no direct coords
                    if not (lat and lng):
                        grid_ref = row.get('Grid ref', row.get('GridRef', row.get('Grid Ref', '')))
                        
                        if grid_ref:
                            coords = self.convert_grid_ref_to_coords(grid_ref)
                            if coords:
                                lat, lng = coords
                    
                    # Skip if still no coordinates
                    if not (lat and lng):
                        skipped_no_coords += 1
                        continue
                    
                    # Get elevation
                    height_str = row.get('Height(m)', row.get('Height', row.get('Metres', '0')))
                    elevation = float(str(height_str).replace('m', '').strip())
                    
                    # Get region/area
                    region = row.get('Region', row.get('Area', row.get('Section', 'Unknown')))
                    
                    # Get map references
                    map_50k = row.get('Map 1:50k', row.get('OS 1:50k', row.get('Map', '')))
                    grid_ref = row.get('Grid ref', row.get('GridRef', row.get('Grid Ref', '')))
                    
                    # Get additional metadata
                    parent = row.get('Parent', '')
                    drop = row.get('Drop', row.get('Col Height', ''))
                    
                    # Determine difficulty based on height and classification
                    difficulty = 'moderate'
                    if elevation > 1100:
                        difficulty = 'hard'
                    elif elevation < 900:
                        difficulty = 'moderate'
                    
                    if classification == 'munros':
                        difficulty = 'hard'  # All munros are challenging
                    elif classification == 'grahams':
                        difficulty = 'easy'
                    
                    attributes = {
                        'elevation_m': elevation,
                        'classification': classification,
                        'region': region,
                        'grid_ref': grid_ref,
                        'os_map_50k': map_50k,
                        'difficulty': difficulty
                    }
                    
                    if parent:
                        attributes['parent_hill'] = parent
                    if drop:
                        try:
                            attributes['drop_m'] = float(str(drop).replace('m', '').strip())
                        except:
                            pass
                    
                    poi_id = hashlib.md5(
                        f"{lat}{lng}{name}dobih".encode()
                    ).hexdigest()[:12]
                    
                    poi = POI(
                        id=poi_id,
                        title=name,
                        type='mountains',
                        lat=lat,
                        lng=lng,
                        description=f"{classification.title()}: {elevation}m peak in {region}",
                        attributes=attributes,
                        sources=['dobih']
                    )
                    pois.append(poi)
                    count += 1
                    
                except Exception as e:
                    continue
            
            print(f"    Added {count} {classification}")
            if skipped_no_coords > 0:
                if OSGRID_AVAILABLE:
                    print(f"    Skipped {skipped_no_coords} hills (invalid grid refs or coords)")
                else:
                    print(f"    Skipped {skipped_no_coords} hills (no coords - install OSGridConverter to fix)")
            
            time.sleep(1)
            
        except Exception as e:
            print(f"    Error fetching {classification}: {e}")
    
    print(f"  Successfully fetched {len(pois)} hills from DoBIH")
    return pois

def fetch_zapmap_chargers(self) -> List[POI]:
    """Fetch EV charging stations from Zap-Map API"""
    print("\nFetching EV chargers from Zap-Map...")
    
    if not self.zapmap_api_key:
        print("  No Zap-Map API key provided, skipping...")
        print("  Get a free API key at: https://www.zap-map.com/api/")
        return []
    
    pois = []
    
    try:
        # Zap-Map API endpoint (check current documentation)
        url = "https://api.zap-map.com/v1/devices"
        
        headers = {
            'Authorization': f'Bearer {self.zapmap_api_key}',
            'Accept': 'application/json'
        }
        
        params = {
            'bbox': f"{self.SCOTLAND_BBOX['west']},{self.SCOTLAND_BBOX['south']},"
                    f"{self.SCOTLAND_BBOX['east']},{self.SCOTLAND_BBOX['north']}",
            'limit': 1000
        }
        
        response = self.session.get(url, headers=headers, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        for device in data.get('devices', []):
            location = device.get('location', {})
            lat = location.get('latitude')
            lng = location.get('longitude')
            
            if not (lat and lng):
                continue
            
            name = device.get('name', 'EV Charging Station')
            address = location.get('address', '')
            
            # Extract connector info
            connectors = device.get('connectors', [])
            connector_types = [c.get('type', '') for c in connectors]
            power_kw = max([c.get('power_kw', 0) for c in connectors], default=0)
            
            facilities = []
            if device.get('accessible', False):
                facilities.append('accessible')
            if device.get('free', False):
                facilities.append('free')
            else:
                facilities.append('paid')
            
            attributes = {
                'connector_types': connector_types,
                'power_kw': power_kw,
                'network': device.get('network', ''),
                'status': device.get('status', 'unknown')
            }
            
            poi_id = hashlib.md5(
                f"{lat}{lng}{name}zapmap".encode()
            ).hexdigest()[:12]
            
            poi = POI(
                id=poi_id,
                title=name,
                type='ev_charging',
                lat=lat,
                lng=lng,
                description=address,
                facilities=facilities,
                attributes=attributes,
                sources=['zapmap']
            )
            pois.append(poi)
        
        print(f"  Found {len(pois)} EV chargers from Zap-Map")
        
    except Exception as e:
        print(f"  Error fetching from Zap-Map: {e}")
    
    return pois

def fetch_wikimedia_image(self, poi: POI) -> Optional[str]:
    """Fetch image from Wikimedia Commons for a POI"""
    try:
        # Wikimedia Commons API
        url = "https://commons.wikimedia.org/w/api.php"
        
        params = {
            'action': 'query',
            'list': 'geosearch',
            'gscoord': f"{poi.lat}|{poi.lng}",
            'gsradius': 1000,  # 1km radius
            'gslimit': 10,
            'format': 'json'
        }
        
        response = self.session.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        pages = data.get('query', {}).get('geosearch', [])
        
        if not pages:
            return None
        
        # Get the first result and fetch its image
        page_id = pages[0]['pageid']
        
        image_params = {
            'action': 'query',
            'pageids': page_id,
            'prop': 'imageinfo',
            'iiprop': 'url',
            'format': 'json'
        }
        
        image_response = self.session.get(url, params=image_params, timeout=10)
        image_response.raise_for_status()
        image_data = image_response.json()
        
        pages_data = image_data.get('query', {}).get('pages', {})
        if pages_data:
            page_data = list(pages_data.values())[0]
            imageinfo = page_data.get('imageinfo', [])
            if imageinfo:
                return imageinfo[0].get('url')
        
        return None
        
    except Exception as e:
        return None

def enrich_with_images(self):
    """Enrich POIs with images from Wikimedia Commons"""
    print("\nEnriching POIs with images from Wikimedia Commons...")
    
    count = 0
    total = len(self.all_pois)
    
    for idx, poi in enumerate(self.all_pois):
        if poi.image_url:  # Already has an image
            continue
        
        if idx > 0 and idx % 50 == 0:
            print(f"  Processed {idx}/{total} POIs, found {count} images")
        
        image_url = self.fetch_wikimedia_image(poi)
        if image_url:
            poi.image_url = image_url
            count += 1
        
        time.sleep(0.5)  # Rate limiting
    
    print(f"  Added {count} images from Wikimedia Commons")

def scrape_all_categories(self):
    """Scrape all POI categories from all sources"""
    # 1. OSM Data
    print("=== Phase 1: OpenStreetMap Data ===")
    for category, query in self.OSM_QUERIES.items():
        pois = self.query_overpass(query, category)
        self.all_pois.extend(pois)
        time.sleep(2)
    
    # 2. Database of British and Irish Hills (replaces Walkhighlands)
    print("\n=== Phase 2: Database of British and Irish Hills ===")
    dobih_pois = self.fetch_dobih_hills()
    self.all_pois.extend(dobih_pois)
    
    # 3. Zap-Map Data
    print("\n=== Phase 3: Zap-Map EV Chargers ===")
    zapmap_pois = self.fetch_zapmap_chargers()
    self.all_pois.extend(zapmap_pois)
    
    print(f"\n=== Total POIs collected: {len(self.all_pois)} ===")

def deduplicate(self, distance_threshold: float = 50.0) -> List[POI]:
    """Remove duplicate POIs based on proximity and name similarity"""
    print("\n=== Deduplication Phase ===")
    
    # Group by approximate location (grid cells)
    grid_size = 0.01  # ~1km
    grid: Dict[tuple, List[POI]] = defaultdict(list)
    
    for poi in self.all_pois:
        grid_key = (
            round(poi.lat / grid_size),
            round(poi.lng / grid_size)
        )
        grid[grid_key].append(poi)
    
    # Check for duplicates within and between adjacent cells
    seen_ids: Set[str] = set()
    unique_pois: List[POI] = []
    
    for cell_key, cell_pois in grid.items():
        # Get POIs from this cell and adjacent cells
        nearby_pois = cell_pois.copy()
        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                if dx == 0 and dy == 0:
                    continue
                adjacent_key = (cell_key[0] + dx, cell_key[1] + dy)
                nearby_pois.extend(grid.get(adjacent_key, []))
        
        for poi in cell_pois:
            if poi.id in seen_ids:
                continue
            
            # Check for duplicates
            is_duplicate = False
            for other_poi in nearby_pois:
                if poi.id == other_poi.id or other_poi.id in seen_ids:
                    continue
                
                # Check distance
                dist = self.haversine_distance(
                    poi.lat, poi.lng,
                    other_poi.lat, other_poi.lng
                )
                
                if dist < distance_threshold:
                    # Check name similarity
                    norm_name1 = self.normalize_name(poi.title)
                    norm_name2 = self.normalize_name(other_poi.title)
                    
                    if norm_name1 and norm_name2:
                        lev_dist = self.levenshtein_distance(norm_name1, norm_name2)
                        max_len = max(len(norm_name1), len(norm_name2))
                        similarity = 1 - (lev_dist / max_len) if max_len > 0 else 0
                        
                        if similarity > 0.8:  # 80% similar
                            # Merge the POIs
                            better_poi = poi if (
                                len(poi.facilities) + len(poi.attributes) + len(poi.image_url) >=
                                len(other_poi.facilities) + len(other_poi.attributes) + len(other_poi.image_url)
                            ) else other_poi
                            
                            worse_poi = other_poi if better_poi == poi else poi
                            
                            # Merge data
                            better_poi.sources = list(set(better_poi.sources + worse_poi.sources))
                            better_poi.facilities = list(set(better_poi.facilities + worse_poi.facilities))
                            better_poi.attributes.update(worse_poi.attributes)
                            
                            if not better_poi.image_url and worse_poi.image_url:
                                better_poi.image_url = worse_poi.image_url
                            if not better_poi.description and worse_poi.description:
                                better_poi.description = worse_poi.description
                            
                            seen_ids.add(worse_poi.id)
                            
                            if worse_poi == poi:
                                is_duplicate = True
                                break
            
            if not is_duplicate:
                seen_ids.add(poi.id)
                unique_pois.append(poi)
    
    print(f"Removed {len(self.all_pois) - len(unique_pois)} duplicates")
    print(f"Unique POIs: {len(unique_pois)}")
    
    return unique_pois

def export_to_json(self, filename: str = "scotland_pois.json"):
    """Export POIs to JSON file"""
    unique_pois = self.deduplicate()
    
    data = {
        'total_count': len(unique_pois),
        'categories': {},
        'pois': [asdict(poi) for poi in unique_pois]
    }
    
    # Count by category
    for poi in unique_pois:
        data['categories'][poi.type] = data['categories'].get(poi.type, 0) + 1
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"\n=== Export Complete ===")
    print(f"Saved to: {filename}")
    print(f"\nCategory breakdown:")
    for cat, count in sorted(data['categories'].items()):
        print(f"  {cat}: {count}")
    
    # Source breakdown
    source_counts = defaultdict(int)
    for poi in unique_pois:
        for source in poi.sources:
            source_counts[source] += 1
    
    print(f"\nSource breakdown:")
    for source, count in sorted(source_counts.items()):
        print(f"  {source}: {count}")
```

# Example usage

if **name** == “**main**”:
# Optional: Add your Zap-Map API key here
# Get one at: https://www.zap-map.com/api/
ZAPMAP_API_KEY = None  # or “your_api_key_here”

```
scraper = ScotlandPOIScraper(zapmap_api_key=ZAPMAP_API_KEY)

# Scrape all categories from all sources
scraper.scrape_all_categories()

# Enrich with Wikimedia images
scraper.enrich_with_images()

# Export deduplicated data
scraper.export_to_json("scotland_pois.json")

print("\n✓ Complete scraping pipeline finished!")
print("\nDependencies:")
print("  pip install requests beautifulsoup4 OSGridConverter")
print("\nData Sources Used:")
print("  ✓ OpenStreetMap - Comprehensive POI data")
print("  ✓ Database of British and Irish Hills - Official hills database")
print("  ✓ Zap-Map API - EV charging stations (if API key provided)")
print("  ✓ Wikimedia Commons - Geotagged images")
print("\nFeatures:")
print("  ✓ Automatic grid reference to lat/lng conversion")
print("  ✓ Smart deduplication across all sources")
print("  ✓ Image enrichment from Wikimedia Commons")
print("  ✓ Complete metadata for all POI types")
```