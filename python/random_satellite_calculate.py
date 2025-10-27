import sys
import json
from datetime import datetime, timedelta
import pytz
from skyfield.api import load, EarthSatellite, wgs84, Topos
import random
from pymongo import MongoClient
import os
import traceback
import numpy as np
from concurrent.futures import ThreadPoolExecutor, as_completed
import warnings
warnings.filterwarnings('ignore')

class StandardSatelliteVisibilityCalculator:
    def __init__(self, mongo_uri='mongodb://localhost:27017'):
        self.ts = load.timescale()
        self.batch_size = 100 
        self.target_count = 5
        self.max_iterations = 10
        self.chunk_size = 25
        self.max_workers = 4
        
        self.min_elevation_angle = 0.0 
        self.max_sun_elevation = -12.0
        self.time_resolution_minutes = 5
        
        self.eph = load('de440.bsp')

        try:
            self.client = MongoClient(mongo_uri)
            db_name = os.getenv('DB_NAME', 'project_orbit')
            self.db = self.client[db_name]
            self.collection = self.db['satellite']
            self.collection.find_one()
        except Exception as e:
            self.client = None
            self.db = None
            self.collection = None

    def get_satellite_count(self):
        if self.collection is None:
            return 0
        return self.collection.count_documents({
            "TLE_LINE1": {"$exists": True, "$ne": ""},
            "TLE_LINE2": {"$exists": True, "$ne": ""},
            "OBJECT_NAME": {"$exists": True, "$ne": ""}
        })

    def get_random_satellites_batch(self, exclude_ids=None):
        if self.collection is None:
            return []
        
        base_query = {
            "TLE_LINE1": {"$exists": True, "$ne": ""},
            "TLE_LINE2": {"$exists": True, "$ne": ""},
            "OBJECT_NAME": {"$exists": True, "$ne": ""}
        }
        
        if exclude_ids:
            base_query["_id"] = {"$nin": exclude_ids}
        
        pipeline = [{"$match": base_query}, {"$sample": {"size": self.batch_size}}]
        results = list(self.collection.aggregate(pipeline))
        
        satellites = []
        for doc in results:
            satellites.append({
                'id': str(doc.get('_id', '')),
                'name': doc.get('OBJECT_NAME', 'Unknown'),
                'tle1': doc.get('TLE_LINE1', ''),
                'tle2': doc.get('TLE_LINE2', ''),
                'norad_id': doc.get('NORAD_CAT_ID', ''),
                'object_type': doc.get('OBJECT_TYPE', ''),
                'country_code': doc.get('COUNTRY_CODE', '')
            })
        return satellites

    def calculate_observation_window(self, observer_lat, observer_lon, target_date, timezone_str, time_mode='auto', start_time=None, end_time=None):
        """
        คำนวณช่วงเวลาสำหรับการสังเกตดาวเทียม
        """
        local_tz = pytz.timezone(timezone_str)
        target_datetime = datetime.strptime(target_date, '%Y-%m-%d')
        observer = Topos(latitude_degrees=observer_lat, longitude_degrees=observer_lon)
        
        if time_mode == 'custom' and start_time and end_time:
            # Custom Time Mode: ใช้เวลาที่ผู้ใช้กำหนด
            start_datetime = datetime.combine(target_datetime.date(), datetime.strptime(start_time, '%H:%M').time())
            end_datetime = datetime.combine(target_datetime.date(), datetime.strptime(end_time, '%H:%M').time())
            
            # ถ้า end_time น้อยกว่า start_time แสดงว่าข้ามวัน
            if end_datetime <= start_datetime:
                end_datetime += timedelta(days=1)
            
            start_search = local_tz.localize(start_datetime)
            end_search = local_tz.localize(end_datetime)
            
            observation_times = []
            current_time = start_search
            
            while current_time <= end_search:
                t = self.ts.from_datetime(current_time.astimezone(pytz.UTC))
                
                # คำนวณมุมดวงอาทิตย์
                astrometric = (self.eph['earth'] + observer).at(t).observe(self.eph['sun']).apparent()
                sun_alt, sun_az, _ = astrometric.altaz()
                sun_elevation = sun_alt.degrees
                
                observation_times.append({
                    'time': t,
                    'local_time': current_time,
                    'sun_elevation': sun_elevation
                })
                
                current_time += timedelta(minutes=self.time_resolution_minutes)
            
            optimal_periods = [(start_search, end_search)]
            
        else:
            # Auto Night Mode: หาช่วงเวลาที่ sun ≤ -12° อัตโนมัติ
            start_search = local_tz.localize(target_datetime.replace(hour=0, minute=0, second=0))
            end_search = local_tz.localize(target_datetime.replace(hour=23, minute=59, second=59))
            
            observation_times = []
            optimal_periods = []
            
            current_time = start_search
            in_observation_window = False
            window_start = None
            
            while current_time <= end_search:
                t = self.ts.from_datetime(current_time.astimezone(pytz.UTC))
                
                # คำนวณมุมดวงอาทิตย์
                astrometric = (self.eph['earth'] + observer).at(t).observe(self.eph['sun']).apparent()
                sun_alt, sun_az, _ = astrometric.altaz()
                sun_elevation = sun_alt.degrees
                
                # ตรวจสอบว่าอยู่ในช่วงเวลาที่เหมาะสม (sun ≤ -12°)
                is_dark_enough = sun_elevation <= self.max_sun_elevation
                
                if is_dark_enough and not in_observation_window:
                    in_observation_window = True
                    window_start = current_time
                elif not is_dark_enough and in_observation_window:
                    in_observation_window = False
                    if window_start:
                        optimal_periods.append((window_start, current_time))
                
                if is_dark_enough:
                    observation_times.append({
                        'time': t,
                        'local_time': current_time,
                        'sun_elevation': sun_elevation
                    })
                
                current_time += timedelta(minutes=self.time_resolution_minutes)
            
            # จบ loop แต่ยังอยู่ใน observation window
            if in_observation_window and window_start:
                optimal_periods.append((window_start, current_time))
        
        return observation_times, optimal_periods

    def validate_tle_format(self, satellites_batch):
        """ตรวจสอบรูปแบบ TLE ตามมาตรฐาน"""
        valid_satellites = []
        
        for sat in satellites_batch:
            tle1, tle2 = sat['tle1'], sat['tle2']
            
            if (tle1 and tle2 and 
                len(tle1.strip()) == 69 and 
                len(tle2.strip()) == 69 and
                tle1.strip().startswith('1 ') and
                tle2.strip().startswith('2 ')):
                valid_satellites.append(sat)
        
        return valid_satellites

    def calculate_satellite_visibility_standard(self, satellite, sat_data, observer_lat, observer_lon, observation_times, time_mode='auto'):
        """
        คำนวณการมองเห็นดาวเทียม
        Auto Mode: elevation > 0°, satellite is sunlit (sun condition pre-filtered)
        Custom Mode: elevation > 0°, satellite is sunlit, และ sun ≤ -12°
        """
        observer_location = wgs84.latlon(observer_lat, observer_lon)
        visible_passes = []
        current_pass = []
        
        try:
            for obs_data in observation_times:
                t = obs_data['time']
                sun_elevation = obs_data['sun_elevation']
                local_time = obs_data['local_time']
                
                # คำนวณตำแหน่งดาวเทียมเทียบกับผู้สังเกต
                difference = satellite - observer_location
                topocentric = difference.at(t)
                
                alt, az, distance = topocentric.altaz()
                elevation_angle = alt.degrees
                azimuth_angle = az.degrees
                range_km = distance.km
                
                # ตรวจสอบการส่องแสงของดาวเทียม
                is_sunlit = bool(satellite.at(t).is_sunlit(self.eph))
                
                # เงื่อนไขการมองเห็นตาม mode
                if time_mode == 'auto':
                    # Auto Night Mode: elevation > 0° และ satellite is sunlit
                    # (sun condition ถูกกรองไว้แล้วในขั้นตอน calculate_observation_window)
                    is_visible = (elevation_angle >= self.min_elevation_angle and is_sunlit)
                else:
                    # Custom Time Mode: elevation > 0°, satellite is sunlit, และ sun ≤ -12°
                    is_visible = (elevation_angle >= self.min_elevation_angle and 
                                is_sunlit and 
                                sun_elevation <= self.max_sun_elevation)
                
                observation_point = {
                    'time': t,
                    'local_time': local_time,
                    'elevation': elevation_angle,
                    'azimuth': azimuth_angle,
                    'range_km': range_km,
                    'sun_elevation': sun_elevation,
                    'is_sunlit': is_sunlit,
                    'is_visible': is_visible
                }
                
                if is_visible:
                    current_pass.append(observation_point)
                else:
                    if current_pass:
                        visible_passes.append(current_pass.copy())
                        current_pass = []
            
            # เก็บ pass สุดท้าย
            if current_pass:
                visible_passes.append(current_pass)
            
            # คัดเลือก pass ที่ดีที่สุด
            if visible_passes:
                best_pass = max(visible_passes, 
                               key=lambda p: max(point['elevation'] for point in p))
                
                best_point = max(best_pass, key=lambda p: p['elevation'])
                
                return {
                    'satellite': sat_data,
                    'total_passes': len(visible_passes),
                    'best_pass_length': len(best_pass),
                    'best_elevation': best_point['elevation'],
                    'best_azimuth': best_point['azimuth'],
                    'best_range_km': best_point['range_km'],
                    'best_observation_time_local': best_point['local_time'],
                    'best_observation_time_utc': best_point['time'].utc_datetime(),
                    'sun_elevation': best_point['sun_elevation'],
                    'is_sunlit': best_point['is_sunlit'],
                    'all_passes': visible_passes
                }
            
        except Exception:
            pass
        
        return None

    def process_satellite_chunk_standard(self, chunk_data):
        """ประมวลผล chunk"""
        satellite_pairs, observer_lat, observer_lon, observation_times, time_mode = chunk_data
        results = []
        
        for satellite_pair in satellite_pairs:
            satellite, sat_data = satellite_pair
            
            result = self.calculate_satellite_visibility_standard(
                satellite, sat_data, observer_lat, observer_lon, observation_times, time_mode
            )
            
            if result:
                results.append(result)
        
        return results

    def create_satellite_objects_batch(self, valid_satellites):
        """สร้าง EarthSatellite objects แบบ batch"""
        satellite_pairs = []
        
        for sat_data in valid_satellites:
            try:
                satellite = EarthSatellite(
                    sat_data['tle1'], 
                    sat_data['tle2'], 
                    sat_data['name'], 
                    self.ts
                )
                satellite_pairs.append((satellite, sat_data))
            except Exception:
                continue
        
        return satellite_pairs

    def find_visible_satellites_standard_method(self, satellites_batch, observer_lat, observer_lon, target_date, timezone_str, time_mode='auto', start_time=None, end_time=None):
        """หาดาวเทียมที่มองเห็นได้"""
        # คำนวณช่วงเวลาการสังเกต
        observation_times, optimal_periods = self.calculate_observation_window(
            observer_lat, observer_lon, target_date, timezone_str, time_mode, start_time, end_time
        )
        
        if not observation_times:
            return []
        
        # กรอง TLE ที่ถูกต้อง
        valid_satellites = self.validate_tle_format(satellites_batch)
        if not valid_satellites:
            return []
        
        # สร้าง satellite objects
        satellite_pairs = self.create_satellite_objects_batch(valid_satellites)
        if not satellite_pairs:
            return []
        
        # แบ่งเป็น chunks สำหรับ parallel processing
        chunks = []
        for i in range(0, len(satellite_pairs), self.chunk_size):
            chunk_pairs = satellite_pairs[i:i+self.chunk_size]
            chunks.append((chunk_pairs, observer_lat, observer_lon, observation_times, time_mode))
        
        # ประมวลผล parallel
        all_results = []
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_chunk = {
                executor.submit(self.process_satellite_chunk_standard, chunk): i 
                for i, chunk in enumerate(chunks)
            }
            
            for future in as_completed(future_to_chunk):
                try:
                    chunk_results = future.result()
                    all_results.extend(chunk_results)
                except Exception:
                    pass
        
        # เรียงลำดับตามคุณภาพ
        all_results.sort(key=lambda x: (x['total_passes'], x['best_elevation']), reverse=True)
        
        return all_results

    def find_qualified_satellites_vectorized(self, observer_lat, observer_lon, target_date, timezone_str, time_mode='auto', start_time=None, end_time=None):
        """หาดาวเทียมที่เหมาะสม"""
        qualified = []
        excluded_ids = set()
        iteration = 0
        total_satellites = self.get_satellite_count()
        
        if total_satellites == 0:
            return []

        while len(qualified) < self.target_count and iteration < self.max_iterations:
            iteration += 1
            
            # ดึงข้อมูล batch
            batch = self.get_random_satellites_batch(exclude_ids=list(excluded_ids))
            if not batch:
                break
            
            # เพิ่ม IDs ไปยัง excluded set
            for sat in batch:
                excluded_ids.add(sat['id'])
            
            # คำนวณหาดาวเทียมที่เหมาะสม
            batch_results = self.find_visible_satellites_standard_method(
                batch, observer_lat, observer_lon, target_date, timezone_str, time_mode, start_time, end_time
            )
            
            qualified.extend(batch_results)
            
            # หยุดถ้าได้เพียงพอ
            if len(qualified) >= self.target_count:
                break
                
            # หยุดถ้าตรวจสอบครบทุกดวง
            if len(excluded_ids) >= total_satellites:
                break

        # เลือกดาวเทียมที่ดีที่สุด
        if len(qualified) > self.target_count:
            qualified = qualified[:self.target_count]
            
        return qualified

    def format_for_web_display(self, qualified_satellites, observer_lat, observer_lon, target_date, timezone_str, time_mode='auto', start_time=None, end_time=None):
        """จัดรูปแบบข้อมูลสำหรับแสดงผล"""
        satellites_data = []
        
        for result in qualified_satellites:
            sat = result['satellite']
            local_tz = pytz.timezone(timezone_str)
            
            # แปลงเวลา UTC เป็น local time
            utc_time = result['best_observation_time_utc']
            if hasattr(utc_time, 'replace'):
                local_time = utc_time.replace(tzinfo=pytz.UTC).astimezone(local_tz)
            else:
                local_time = result['best_observation_time_local']
            
            satellites_data.append({
                'name': sat['name'],
                'tle1': sat['tle1'],
                'tle2': sat['tle2'],
                'norad_id': sat.get('norad_id', ''),
                'object_type': sat.get('object_type', ''),
                'country_code': sat.get('country_code', ''),
                'sun_elevation': round(result['sun_elevation'], 2),
                'best_satellite_elevation': round(result['best_elevation'], 2),
                'best_azimuth': round(result['best_azimuth'], 2),
                'best_range_km': round(result['best_range_km'], 3),
                'is_sunlit': result['is_sunlit'],
                'total_passes': result['total_passes'],
                'best_pass_duration_points': result['best_pass_length'],
                'best_observation_time_local': local_time.strftime("%Y-%m-%d %H:%M:%S %Z") if hasattr(local_time, 'strftime') else str(local_time),
                'best_observation_time_utc': utc_time.strftime("%Y-%m-%d %H:%M:%S UTC") if hasattr(utc_time, 'strftime') else str(utc_time)
            })

        calculation_method = "Custom Time Range" if time_mode == 'custom' else "Auto Night Detection"
        
        return {
            'success': True,
            'count': len(satellites_data),
            'satellites': satellites_data,
            'calculation_parameters': {
                'latitude': observer_lat,
                'longitude': observer_lon,
                'target_date': target_date,
                'timezone': timezone_str,
                'time_mode': time_mode,
                'custom_start_time': start_time if time_mode == 'custom' else None,
                'custom_end_time': end_time if time_mode == 'custom' else None,
                'calculation_method': calculation_method,
                'visibility_conditions': {
                    'auto_mode': 'Satellite elevation > 0°, Satellite is sunlit (Sun < -12° pre-filtered)',
                    'custom_mode': 'Satellite elevation > 0°, Satellite is sunlit, Sun elevation < -12°'
                },
                'min_elevation_angle': self.min_elevation_angle,
                'max_sun_elevation': self.max_sun_elevation,
                'time_resolution_minutes': self.time_resolution_minutes,
                'batch_size': self.batch_size,
                'target_count': self.target_count,
                'max_iterations': self.max_iterations
            },
            'generated_at': datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            'message': f"Found {len(satellites_data)} satellites using {calculation_method.lower()} method"
        }

    def close_connection(self):
        if self.client:
            self.client.close()

def main():
    try:
        input_data = json.load(sys.stdin)
        latitude = float(input_data['lat'])
        longitude = float(input_data['lon'])
        target_date = input_data['date']
        timezone_str = input_data.get('timezone', 'UTC')
        mongo_uri = input_data.get('mongo_uri', 'mongodb://localhost:27017')
        
        # รองรับ custom time parameters
        time_mode = input_data.get('time_mode', 'auto')
        start_time = input_data.get('start_time', '')
        end_time = input_data.get('end_time', '')
        
        # ตรวจสอบ time mode
        if time_mode == 'custom' and not (start_time and end_time):
            time_mode = 'auto'  # fallback ถ้าไม่มีเวลากำหนด

        calculator = StandardSatelliteVisibilityCalculator(mongo_uri=mongo_uri)
        
        if calculator.collection is None:
            result = {'success': False, 'error': 'Database connection failed'}
        else:
            # หาดาวเทียมที่เหมาะสม
            qualified = calculator.find_qualified_satellites_vectorized(
                latitude, longitude, target_date, timezone_str, time_mode, start_time, end_time
            )
            result = calculator.format_for_web_display(
                qualified, latitude, longitude, target_date, timezone_str, time_mode, start_time, end_time
            )

        calculator.close_connection()
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc(),
            'message': f'Error occurred during satellite visibility calculation (mode: {input_data.get("time_mode", "auto")})'
        }
        print(json.dumps(error_result, ensure_ascii=False, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()