const _ = require('lodash');

// JS helper methods from:
// https://medium.com/@hatemalimam/extract-text-and-data-from-any-document-using-amazon-textract-in-node-js-9a72136c6e64

const getText = (result, blocksMap) => {
  let text = "";
  if (_.has(result, "Relationships")) {
    result.Relationships.forEach(relationship => {
      if (relationship.Type === "CHILD") {
        relationship.Ids.forEach(childId => {
          const word = blocksMap[childId];
          if (word.BlockType === "WORD") {
            text += `${word.Text} `;
          }
          if (word.BlockType === "SELECTION_ELEMENT") {
            if (word.SelectionStatus === "SELECTED") {
              text += `X `;
            }
          }
        });
      }
    });
  }
  return text.trim();
};

const findValueBlock = (keyBlock, valueMap) => {
  let valueBlock;
  keyBlock.Relationships.forEach(relationship => {
    if (relationship.Type === "VALUE") {
      // eslint-disable-next-line array-callback-return
      relationship.Ids.every(valueId => {
        if (_.has(valueMap, valueId)) {
          valueBlock = valueMap[valueId];
          return false;
        }
      });
    }
  });
  return valueBlock;
};

const getKeyValueMap = blocks => {
  const keyMap = {};
  const valueMap = {};
  const blockMap = {};
  let blockId;
  blocks.forEach(block => {
    blockId = block.Id;
    blockMap[blockId] = block;
    if (block.BlockType === "KEY_VALUE_SET") {
      if (_.includes(block.EntityTypes, "KEY")) {
        keyMap[blockId] = block;
      } else {
        valueMap[blockId] = block;
      }
    }
  });
  return { keyMap, valueMap, blockMap };
};

const getKeyValueRelationship = (keyMap, valueMap, blockMap) => {
  const keyValues = {};
  const keyMapValues = _.values(keyMap);
  keyMapValues.forEach(keyMapValue => {
    const valueBlock = findValueBlock(keyMapValue, valueMap);
    const key = getText(keyMapValue, blockMap);
    const value = getText(valueBlock, blockMap);
    // NOTE: Expect key/values to be overriden if they share same label
    keyValues[key] = value;
  });
  return keyValues;
};

// Straight forward data block key/value mapper
const keyValuesFromBlocks = blocks => {
  const { keyMap, valueMap, blockMap } = getKeyValueMap(blocks);
  const keyValues = getKeyValueRelationship(keyMap, valueMap, blockMap);
  return keyValues;
}

module.exports = {
  findValueBlock,
  getText,
  getKeyValueMap,
  getKeyValueRelationship,
  keyValuesFromBlocks,
};
