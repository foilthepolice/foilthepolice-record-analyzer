const _ = require('lodash');
const stringSimilarity = require('string-similarity');
const { getKeyValueMap, getText, findValueBlock } = require('../aws/textractUtils');
const { distanceBetweenPoints } = require('../utils');

const getBoundingBoxCenter = (boundingBox) => ({
  y: boundingBox.Top + (boundingBox.Height / 2),
  x: boundingBox.Left + (boundingBox.Width / 2),
});

function getKeyValue(kv, field, sort = {}) {
  const key = stringSimilarity.findBestMatch(field, Object.keys(kv)).bestMatch.target;
  const valuesSorted = sort != null
    ? _.sortBy((kv[key] || []), [v => distanceBetweenPoints(sort.coordinate, v[1])])
    : kv[key];
  return _.get(valuesSorted, `[${sort.position || 0}][0]`, '');
}

function getKeyValueCoordinates(kv, field) {
  const key = stringSimilarity.findBestMatch(field, Object.keys(kv)).bestMatch.target;
  return _.get(kv[key], '[0][1]');
}

const getKeyValueRelationshipForUseOfForceReport = (keyMap, valueMap, blockMap) => {
  // Get KeyValues w/ Page Coordinates
  const keyValues = {};
  const keyMapValues = _.values(keyMap);
  keyMapValues.forEach(keyMapValue => {
    const valueBlock = findValueBlock(keyMapValue, valueMap);
    const key = getText(keyMapValue, blockMap);
    const value = getText(valueBlock, blockMap);
    if (!keyValues[key]) keyValues[key] = [];
    keyValues[key].push([value, getBoundingBoxCenter(keyMapValue.Geometry.BoundingBox)]);
  });

  // Compile report, officer, subject values
  const badgeCoordinates = getKeyValueCoordinates(keyValues, 'badge');
  const general = {
    date: getKeyValue(keyValues, 'Date'),
    time: getKeyValue(keyValues, 'Time'),
    day_of_week: getKeyValue(keyValues, 'Day of Week'),
    incident_number: getKeyValue(keyValues, 'INCIDENT NUMBER'),
    location: getKeyValue(keyValues, 'Location'),
  };
  // Compible subject values, determined by their proximinity to the badge # coordinates
  const officer = {
    officer_badge_number: getKeyValue(keyValues, 'Badge#'),
    officer_name: getKeyValue(keyValues, 'Name, (Last, First, Middle)', { coordinate: badgeCoordinates, position: 0 }),
    officer_race: getKeyValue(keyValues, 'Race', { coordinate: badgeCoordinates, position: 0 }),
    officer_sex: getKeyValue(keyValues, 'Sex', { coordinate: badgeCoordinates, position: 0 }),
    officer_age: getKeyValue(keyValues, 'Age', { coordinate: badgeCoordinates, position: 0 }),
    officer_rank: getKeyValue(keyValues, 'Rank', { coordinate: badgeCoordinates, position: 0 }),
    officer_on_duty: getKeyValue(keyValues, 'On Duty', { coordinate: badgeCoordinates, position: 0 }),
    officer_uniform: getKeyValue(keyValues, 'Uniform', { coordinate: badgeCoordinates, position: 0 }),
    officer_assignment: getKeyValue(keyValues, 'Duty Assignment', { coordinate: badgeCoordinates, position: 0 }),
    officer_years_of_service: getKeyValue(keyValues, 'Years of Service', { coordinate: badgeCoordinates, position: 0 }),
    officer_injured: getKeyValue(keyValues, 'Injured', { coordinate: badgeCoordinates, position: 0 }),
    officer_killed: getKeyValue(keyValues, 'Killed', { coordinate: badgeCoordinates, position: 0 }),
  };
  // NOTE: Why we switch to position 0 on coordinate checks is because the officer doesn't have those fields, but there are subject 2 fields we want to sort above
  const firedAtOfficerCoordinates = getKeyValueCoordinates(keyValues, 'Fired at officer or another');
  const subject = {
    subject_race: getKeyValue(keyValues, 'Race', { coordinate: badgeCoordinates, position: 1 }),
    subject_sex: getKeyValue(keyValues, 'Sex', { coordinate: badgeCoordinates, position: 1 }),
    subject_age: getKeyValue(keyValues, 'Age', { coordinate: badgeCoordinates, position: 1 }),
    subject_under_influence: getKeyValue(keyValues, 'Under the Influence', { coordinate: badgeCoordinates, position: 0 }),
    subject_unusual_conduct: getKeyValue(keyValues, 'Other unusual Condition (Specify)', { coordinate: badgeCoordinates, position: 0 }),
    subject_injured: getKeyValue(keyValues, 'Injured', { coordinate: badgeCoordinates, position: 1 }),
    subject_killed: getKeyValue(keyValues, 'Killed', { coordinate: badgeCoordinates, position: 1 }),
    subject_arrested: getKeyValue(keyValues, 'Arrested', { coordinate: badgeCoordinates, position: 1 }),
    subject_charges: getKeyValue(keyValues, 'Charges', { coordinate: badgeCoordinates, position: 1 }),
    subject_actions_resisted_officer: getKeyValue(keyValues, 'Resisted police officer control', { coordinate: badgeCoordinates, position: 0 }),
    subject_actions_threat_attack_physical: getKeyValue(keyValues, 'Physical threatlattack on officer or another', { coordinate: badgeCoordinates, position: 0 }),
    subject_actions_threat_attack_blunt: getKeyValue(keyValues, 'Threatened/attacked officer or another with blunt object', { coordinate: badgeCoordinates, position: 0 }),
    subject_actions_threat_attack_knife: getKeyValue(keyValues, 'Threatened/attacked officer or another with knife/cutting object', { coordinate: badgeCoordinates, position: 0 }),
    subject_actions_threat_attack_vehicle: getKeyValue(keyValues, 'Threatened/attacked officer or another with motor vehicle', { coordinate: badgeCoordinates, position: 0 }),
    subject_actions_threat_attack_firearm: getKeyValue(keyValues, 'Threatened officer or another with firearm', { coordinate: badgeCoordinates, position: 0 }),
    subject_actions_fired: getKeyValue(keyValues, 'Fired at officer or another', { coordinate: badgeCoordinates, position: 0 }),
    subject_actions_other: getKeyValue(keyValues, 'Other (Specify', { coordinate: firedAtOfficerCoordinates, position: 0 }),
  };
  const incident = {
    incident_type_crime_in_progress: getKeyValue(keyValues, 'Crime in Progress'),
    incident_type_domestic: getKeyValue(keyValues, 'Domestic'),
    incident_type_other_dispute: getKeyValue(keyValues, 'Other Dispute'),
    incident_type_suspicious_person: getKeyValue(keyValues, 'Suspicious Person'),
    incident_type_traffic_stop: getKeyValue(keyValues, 'Traffic Stop'),
    incident_type_other_type_of_call: getKeyValue(keyValues, 'Other Type of Call'),
  };
  const canineCoordinates = getKeyValueCoordinates(keyValues, 'Canine');
  const useOfForce = {
    officer_force_used_compliance_hold: getKeyValue(keyValues, 'Compliance Hold', { coordinate: badgeCoordinates, position: 0 }),
    officer_force_used_hands_fists: getKeyValue(keyValues, 'Hands/Fists', { coordinate: badgeCoordinates, position: 0 }),
    officer_force_used_kicks_feet: getKeyValue(keyValues, 'Kicks/Feet', { coordinate: badgeCoordinates, position: 0 }),
    officer_force_used_chemical_agent: getKeyValue(keyValues, 'Chemical/Natural Agent', { coordinate: badgeCoordinates, position: 0 }),
    officer_force_used_blunt_strike: getKeyValue(keyValues, 'Strike/Use Baton or Other Object', { coordinate: badgeCoordinates, position: 0 }),
    officer_force_used_canine: getKeyValue(keyValues, 'Canine', { coordinate: badgeCoordinates, position: 0 }),
    officer_force_used_firearm_intentional: getKeyValue(keyValues, 'Intentional', { coordinate: badgeCoordinates, position: 0 }),
    officer_force_used_firearm_accidental: getKeyValue(keyValues, 'Accidental', { coordinate: badgeCoordinates, position: 0 }),
    officer_force_used_firearm_shots_fired: '', // TODO: Our parser isn't picking it up, may be inaccurate...
    officer_force_used_firearm_shots_hit: getKeyValue(keyValues, 'Number of Hits:', { coordinate: badgeCoordinates, position: 0 }),
    officer_force_used_other: getKeyValue(keyValues, 'Other (Specify', { coordinate: canineCoordinates, position: 0 }),
  };

  // Clean & Return
  return {
    ...general,
    ...officer,
    ...subject,
    ...incident,
    ...useOfForce,
  };
};

const getStructuredUseOfForceReportData = blocks => {
  const { keyMap, valueMap, blockMap } = getKeyValueMap(blocks);
  const keyValues = getKeyValueRelationshipForUseOfForceReport(keyMap, valueMap, blockMap);
  return keyValues;
}


module.exports = getStructuredUseOfForceReportData;