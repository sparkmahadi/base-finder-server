
/** utility function
 * Normalize 'shelf', 'division', and 'position' fields to numbers
 * for all documents in the specified MongoDB collection.
 *
 * @param {Collection} collection - MongoDB collection object
 * @returns {Promise<{ updatedCount: number }>} - Count of updated documents
 */
async function normalizeFieldsToNumbers(collection) {
  let updatedCount = 0;

  const cursor = collection.find({
    $or: [
      { shelf: { $type: 'string' } },
      { division: { $type: 'string' } },
      { position: { $type: 'string' } }
    ]
  });

  for await (const doc of cursor) {
    const update = {};
    const numericShelf = parseInt(doc.shelf);
    const numericDivision = parseInt(doc.division);
    const numericPosition = parseInt(doc.position);

    if (!isNaN(numericShelf)) update.shelf = numericShelf;
    if (!isNaN(numericDivision)) update.division = numericDivision;
    if (!isNaN(numericPosition)) update.position = numericPosition;

    if (Object.keys(update).length > 0) {
      await collection.updateOne({ _id: doc._id }, { $set: update });
      updatedCount++;
    }
  }

  return { updatedCount };
}

module.exports = normalizeFieldsToNumbers;