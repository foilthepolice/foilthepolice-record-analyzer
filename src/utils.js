const _ = require('lodash');

// Quick copy of
// https://github.com/fabrianibrahim/sort-distance/blob/master/index.js

const name = { x: 'x', y: 'y' };

function getDistanceY (p1, p2) {
  return (_.get(p1, name.y) - _.get(p2, name.y)) * (_.get(p1, name.y) - _.get(p2, name.y));
}

function getDistanceX (p1, p2) {
  return (_.get(p1, name.x) - _.get(p2, name.x)) * (_.get(p1, name.x) - _.get(p2, name.x));
}
function distanceBetweenPoints (p1, p2) {
  return Math.abs(Math.sqrt(getDistanceY(p1, p2, name) + getDistanceX(p1, p2, name)));
}

module.exports = {
  distanceBetweenPoints,
};
