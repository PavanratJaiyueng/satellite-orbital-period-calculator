import mongoose from 'mongoose';

const satelliteSchema = new mongoose.Schema({
  _id: String,
  CCSDS_OMM_VERS: String,
  COMMENT: String,
  CREATION_DATE: String,
  ORIGINATOR: String,
  OBJECT_NAME: { type: String, required: true },
  OBJECT_ID: String,
  CENTER_NAME: String,
  REF_FRAME: String,
  TIME_SYSTEM: String,
  MEAN_ELEMENT_THEORY: String,
  EPOCH: String,
  MEAN_MOTION: String,
  ECCENTRICITY: String,
  INCLINATION: String,
  RA_OF_ASC_NODE: String,
  ARG_OF_PERICENTER: String,
  MEAN_ANOMALY: String,
  EPHEMERIS_TYPE: String,
  CLASSIFICATION_TYPE: String,
  NORAD_CAT_ID: String,
  ELEMENT_SET_NO: String,
  REV_AT_EPOCH: String,
  BSTAR: String,
  MEAN_MOTION_DOT: String,
  MEAN_MOTION_DDOT: String,
  SEMIMAJOR_AXIS: String,
  PERIOD: String,
  APOAPSIS: String,
  PERIAPSIS: String,
  OBJECT_TYPE: String,
  RCS_SIZE: String,
  COUNTRY_CODE: String,
  LAUNCH_DATE: String,
  SITE: String,
  DECAY_DATE: String,
  FILE: String,
  GP_ID: String,
  TLE_LINE0: String,
  TLE_LINE1: String,
  TLE_LINE2: String,
  date_process: Date,
  dateAdded: { type: Date, default: Date.now }
}, {
  collection: 'satellite'
});

const Satellite = mongoose.model('satellite', satelliteSchema);

export default Satellite;
