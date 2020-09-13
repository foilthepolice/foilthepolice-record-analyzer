const getPlainTextDocumentData = blocks => {
  return blocks
    .filter(b => b.Text)
    .map(b => b.Text)
    .join(' ');
}

module.exports = getPlainTextDocumentData;