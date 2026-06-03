(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.NBERZotero = root.NBERZotero || {};
    Object.assign(root.NBERZotero, factory());
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function applyFields(item, fields) {
    for (const [field, value] of Object.entries(fields || {})) {
      if (value !== undefined && value !== null && value !== "") {
        item.setField(field, value);
      }
    }
  }

  function getItemTypeID(itemType) {
    if (globalThis.Zotero && Zotero.ItemTypes && Zotero.ItemTypes.getID) {
      return Zotero.ItemTypes.getID(itemType) || itemType;
    }
    return itemType;
  }

  function setItemType(item, itemType) {
    if (!itemType) return;
    if (typeof item.setType === "function") {
      item.setType(getItemTypeID(itemType));
      return;
    }
    item.itemType = itemType;
  }

  async function createPreprintAndAttachPdf(zotero, attachment, payload) {
    const item = new zotero.Item(payload.itemType);
    item.libraryID = attachment.libraryID;
    applyFields(item, payload.fields);
    item.setCreators(payload.creators || []);
    await item.saveTx();

    attachment.parentID = item.id;
    await attachment.saveTx();

    return item;
  }

  async function updateItemFromPayload(item, payload) {
    setItemType(item, payload.itemType);
    applyFields(item, payload.fields);
    item.setCreators(payload.creators || []);
    await item.saveTx();
    return item;
  }

  return {
    applyFields,
    createPreprintAndAttachPdf,
    setItemType,
    updateItemFromPayload
  };
});
