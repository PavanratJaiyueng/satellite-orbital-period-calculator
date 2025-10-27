import sys
import json
from datetime import datetime, timedelta
import pytz
from skyfield.api import load, EarthSatellite, wgs84, Topos
import math

input_data = json.load(sys.stdin)

if 'satellites' not in input_data:
    print("Error: missing 'satellites' key in input JSON", file=sys.stderr)
    sys.exit(1)

tle_list = input_data['satellites']
latitude = float(input_data['lat'])
longitude = float(input_data['lon'])
date_str = input_data['date']
timezone_str = input_data.get('timezone', 'UTC')
time_mode = input_data.get('time_mode', 'auto')
start_time_str = input_data.get('start_time', '')
end_time_str = input_data.get('end_time', '')

ts = load.timescale()
local_tz = pytz.timezone(timezone_str)

target_date = datetime.strptime(date_str, '%Y-%m-%d')

eph = load('de440.bsp')

# ------------------------
# กำหนดช่วงเวลาตาม mode
# ------------------------
if time_mode == 'custom' and start_time_str and end_time_str:
    
    # สร้าง datetime objects สำหรับ start และ end time
    start_datetime = datetime.combine(target_date.date(), datetime.strptime(start_time_str, '%H:%M').time())
    end_datetime = datetime.combine(target_date.date(), datetime.strptime(end_time_str, '%H:%M').time())
    
    # ถ้า end_time น้อยกว่า start_time แสดงว่าข้ามวัน
    if end_datetime <= start_datetime:
        end_datetime += timedelta(days=1)
    
    # แปลงเป็น UTC
    start_utc = local_tz.localize(start_datetime).astimezone(pytz.UTC)
    end_utc = local_tz.localize(end_datetime).astimezone(pytz.UTC)
    
    # สร้าง time steps ทุกนาที
    time_steps = []
    current_time = start_utc
    while current_time <= end_utc:
        time_steps.append(current_time)
        current_time += timedelta(minutes=1)
    
    calculation_method = "Custom Time Range"
    
else:

    utc_midnight = datetime.combine(target_date.date(), datetime.min.time()).replace(tzinfo=pytz.UTC)
    
    # หาช่วงเวลากลางคืน (sun_alt <= -12)
    night_time_steps = []
    second_steps = list(range(0, 24 * 60 * 60, 60))  # ทุก 1 นาที
    
    for second in second_steps:
        utc_time = utc_midnight + timedelta(seconds=second)
        t = ts.from_datetime(utc_time)
        
        # คำนวณมุมดวงอาทิตย์
        observer_sun = eph['earth'] + Topos(latitude_degrees=latitude, longitude_degrees=longitude)
        astrometric = observer_sun.at(t).observe(eph['sun'])
        apparent = astrometric.apparent()
        sun_alt, sun_az, sun_distance = apparent.altaz()
        
        if sun_alt.degrees <= -12:  # เฉพาะช่วงกลางคืน
            night_time_steps.append(utc_time)
    
    time_steps = night_time_steps
    calculation_method = "Auto Night Detection"
    
    if not time_steps:
        calculation_method = "No valid time range found (Sun altitude never ≤ -12°)"


# ------------------------
# ส่วน 1: Orbit Info
# ------------------------
orbit_infos = []

for sat_info in tle_list:
    name = sat_info['name']
    tle1 = sat_info['tle1']
    tle2 = sat_info['tle2']

    try:
        satellite = EarthSatellite(tle1, tle2, name, ts)
    except ValueError as e:
        sys.stderr.write(f"Error parsing TLE for {name}: {e}\n")
        continue

    # คำนวณคาบวงโคจร
    no_kozai = float(satellite.model.no_kozai)
    mean_motion_rev_per_day = no_kozai / (2 * math.pi) * 60 * 24
    if mean_motion_rev_per_day <= 0:
        continue

    orbital_period_minutes = (1 / mean_motion_rev_per_day) * 24 * 60
    orbital_period_seconds = orbital_period_minutes * 60

    # คำนวณความเร็ววงโคจร
    earth_radius_km = 6371
    now = ts.now()
    elevation_km = satellite.at(now).subpoint().elevation.km
    radius_km = earth_radius_km + elevation_km
    orbital_velocity_km_s = (2 * math.pi * radius_km) / orbital_period_seconds

    # กำหนด sampling frequency ตามแนวทางฟิสิกส์
    f_min = 2 / orbital_period_seconds
    
    if orbital_period_seconds < 6000:
        f_max = 1 / 60 
    else:
        f_max = 1 / 300

    sampling_frequency = max(f_min, min(0.1, f_max))

    points = int(sampling_frequency * orbital_period_seconds)
    time_step_seconds = orbital_period_seconds / points
    time_step_minutes = time_step_seconds / 60
    distance_per_step_km = orbital_velocity_km_s * time_step_seconds

    # ใช้ช่วงเวลาที่กำหนด
    if time_steps:
        start_utc = time_steps[0]
        end_utc = time_steps[-1]
        start_local = start_utc.astimezone(local_tz)
        end_local = end_utc.astimezone(local_tz)
        duration_seconds = (end_utc - start_utc).total_seconds()
    else:
        start_local = datetime.now(local_tz)
        end_local = start_local + timedelta(seconds=orbital_period_seconds)
        duration_seconds = orbital_period_seconds

    # OMM parameters
    omm = {
        "OBJECT_NAME": name,
        "OBJECT_ID": satellite.model.satnum,
        "EPOCH": satellite.epoch.utc_iso(),
        "MEAN_MOTION": mean_motion_rev_per_day,
        "ECCENTRICITY": float(satellite.model.ecco),
        "INCLINATION": round(satellite.model.inclo * 180 / math.pi, 4),
        "RA_OF_ASC_NODE": round(satellite.model.nodeo * 180 / math.pi, 4),
        "ARG_OF_PERICENTER": round(satellite.model.argpo * 180 / math.pi, 4),
        "MEAN_ANOMALY": round(satellite.model.mo * 180 / math.pi, 4),
        "BSTAR": float(satellite.model.bstar),
        "MEAN_MOTION_DOT": float(satellite.model.ndot),
        "MEAN_MOTION_DDOT": float(satellite.model.nddot)
    }

    # ตำแหน่งตามรอบโคจร - คำนวณในช่วงเวลาที่กำหนด
    satellite_points = []
    current_point_time = start_local
    while current_point_time <= end_local:
        dt_utc = current_point_time.astimezone(pytz.UTC)
        
        # ตรวจสอบว่าเวลานี้อยู่ในช่วงที่กำหนดหรือไม่
        if dt_utc in time_steps or any(abs((dt_utc - step).total_seconds()) < 30 for step in time_steps):
            t = ts.from_datetime(dt_utc)
            
            # คำนวณมุมดวงอาทิตย์
            observer_sun = eph['earth'] + Topos(latitude_degrees=latitude, longitude_degrees=longitude)
            astrometric = observer_sun.at(t).observe(eph['sun'])
            apparent = astrometric.apparent()
            sun_alt, sun_az, sun_distance = apparent.altaz()
            
            subpoint = satellite.at(t).subpoint()
            satellite_points.append({
                "datetime_local": current_point_time.strftime("%Y-%m-%d %H:%M:%S"),
                "datetime_utc": dt_utc.strftime("%Y-%m-%d %H:%M:%S UTC"),
                "latitude": round(subpoint.latitude.degrees, 6),
                "longitude": round(subpoint.longitude.degrees, 6),
                "elevation_km": round(subpoint.elevation.km, 2),
                "sun_alt": round(sun_alt.degrees, 2)
            })
        
        current_point_time += timedelta(seconds=time_step_seconds)

    orbit_infos.append({
        "name": name,
        "orbital_period_minutes": round(orbital_period_minutes, 2),
        "omm": omm,
        "time_step_minutes": round(time_step_minutes, 2),
        "average_velocity_km_s": round(orbital_velocity_km_s, 3),
        "distance_per_step_km": round(distance_per_step_km, 2),
        "radius_km": round(radius_km, 2),
        "orbitaldistance_km": round(2 * math.pi * radius_km, 2),
        "observation_period": {
            "start_local": start_local.strftime("%Y-%m-%d %H:%M:%S %Z") if time_steps else "N/A",
            "end_local": end_local.strftime("%Y-%m-%d %H:%M:%S %Z") if time_steps else "N/A",
            "duration_minutes": round(duration_seconds / 60, 2) if time_steps else 0,
            "calculation_method": calculation_method
        },
        "positions": satellite_points
    })

# ------------------------
# ส่วน 2: Visibility Info
# ------------------------
minute_results = []

for utc_time in time_steps:
    local_time = utc_time.astimezone(local_tz)
    t = ts.from_datetime(utc_time)

    hour_data = {
        "local_time": local_time.strftime("%Y-%m-%d %H:%M:%S %Z"),
        "utc_time": utc_time.strftime("%Y-%m-%d %H:%M:%S UTC"),
        "satellites": []
    }

    # มุมดวงอาทิตย์
    observer_sun = eph['earth'] + Topos(latitude_degrees=latitude, longitude_degrees=longitude)
    astrometric = observer_sun.at(t).observe(eph['sun'])
    apparent = astrometric.apparent()
    sun_alt, sun_az, sun_distance = apparent.altaz()

    for sat_info in tle_list:
        name = sat_info['name']
        tle1 = sat_info['tle1']
        tle2 = sat_info['tle2']
        satellite = EarthSatellite(tle1, tle2, name, ts)

        # alt/az ของดาวเทียม
        difference = satellite - wgs84.latlon(latitude, longitude)
        topocentric = difference.at(t)
        alt, az, distance = topocentric.altaz()

        sunlit_bool = bool(satellite.at(t).is_sunlit(eph))

        is_visible = bool((alt.degrees > 0) and sunlit_bool and (sun_alt.degrees <= -12))

        hour_data["satellites"].append({
            "name": name,
            "altitude": round(alt.degrees, 6),
            "azimuth": round(az.degrees, 6),
            "distance_km": round(distance.km, 3),
            "is_sunlit": sunlit_bool,
            "is_visible": is_visible,
            "sun_alt": round(sun_alt.degrees, 2)
        })

    minute_results.append(hour_data)

# ------------------------
# ส่วน 3: Current Position (Real-time)
# ------------------------
current_positions = []
current_utc = datetime.utcnow().replace(tzinfo=pytz.UTC)
current_local = current_utc.astimezone(local_tz)
current_t = ts.from_datetime(current_utc)

# คำนวณมุมดวงอาทิตย์ ณ เวลาปัจจุบัน
observer_sun_current = eph['earth'] + Topos(latitude_degrees=latitude, longitude_degrees=longitude)
astrometric_current = observer_sun_current.at(current_t).observe(eph['sun'])
apparent_current = astrometric_current.apparent()
current_sun_alt, current_sun_az, current_sun_distance = apparent_current.altaz()

for sat_info in tle_list:
    name = sat_info['name']
    tle1 = sat_info['tle1']
    tle2 = sat_info['tle2']

    try:
        satellite = EarthSatellite(tle1, tle2, name, ts)
    except ValueError as e:
        continue

    # คำนวณตำแหน่งปัจจุบัน
    subpoint_current = satellite.at(current_t).subpoint()
    
    # คำนวณ alt/az สำหรับผู้สังเกต
    difference_current = satellite - wgs84.latlon(latitude, longitude)
    topocentric_current = difference_current.at(current_t)
    alt_current, az_current, distance_current = topocentric_current.altaz()
    
    # ตรวจสอบว่าได้รับแสงอาทิตย์หรือไม่
    sunlit_current = bool(satellite.at(current_t).is_sunlit(eph))
    
    # ตรวจสอบการมองเห็น
    is_visible_current = bool((alt_current.degrees > 0) and sunlit_current and (current_sun_alt.degrees <= -12))

    # หาความเร็วจาก orbit info ที่คำนวณไว้
    orbital_velocity = None
    for orbit_sat in orbit_infos:
        if orbit_sat['name'] == name:
            orbital_velocity = orbit_sat['average_velocity_km_s']
            break

    current_positions.append({
        "name": name,
        "current_time_utc": current_utc.strftime("%Y-%m-%d %H:%M:%S UTC"),
        "current_time_local": current_local.strftime("%Y-%m-%d %H:%M:%S %Z"),
        "latitude": round(subpoint_current.latitude.degrees, 6),
        "longitude": round(subpoint_current.longitude.degrees, 6),
        "elevation_km": round(subpoint_current.elevation.km, 2),
        "altitude_from_observer": round(alt_current.degrees, 6),
        "azimuth_from_observer": round(az_current.degrees, 6),
        "distance_from_observer_km": round(distance_current.km, 3),
        "orbital_velocity_km_s": round(orbital_velocity, 3) if orbital_velocity else None,
        "is_sunlit": sunlit_current,
        "is_visible": is_visible_current,
        "sun_altitude": round(current_sun_alt.degrees, 2)
    })

# ------------------------
# รวมผลลัพธ์
# ------------------------
utc_now = datetime.utcnow().replace(tzinfo=pytz.UTC)

output = {
    "latitude": latitude,
    "longitude": longitude,
    "timezone": timezone_str,
    "generated_at": utc_now.strftime("%Y-%m-%d %H:%M:%S UTC"),
    "calculation_info": {
        "time_mode": time_mode,
        "calculation_method": calculation_method,
        "total_time_steps": len(time_steps),
        "observation_start_utc": time_steps[0].strftime("%Y-%m-%d %H:%M:%S UTC") if time_steps else "N/A",
        "observation_end_utc": time_steps[-1].strftime("%Y-%m-%d %H:%M:%S UTC") if time_steps else "N/A",
        "custom_start_time": start_time_str if time_mode == 'custom' else None,
        "custom_end_time": end_time_str if time_mode == 'custom' else None
    },
    "calculation_time": {
        "utc": current_utc.strftime("%Y-%m-%d %H:%M:%S UTC"),
        "local": current_local.strftime("%Y-%m-%d %H:%M:%S %Z"),
        "timestamp": current_utc.timestamp()
    },
    "orbit_info": orbit_infos,
    "minute_results": minute_results,
    "current_positions": current_positions
}

# stdout - ส่ง JSON ผลลัพธ์
print(json.dumps(output, ensure_ascii=False, indent=2))

# save file
# with open('python/star_position.json', 'w', encoding='utf-8') as f:
#     json.dump(output, f, ensure_ascii=False, indent=2)