var NBERZoteroPlugin;

function load(rootURI, path) {
  Services.scriptloader.loadSubScript(rootURI + path);
}

function startup(data, reason) {
  load(data.rootURI, "src/nber-id.js");
  load(data.rootURI, "src/nber-page-parser.js");
  load(data.rootURI, "src/nber-metadata.js");
  load(data.rootURI, "src/zotero-item-writer.js");
  load(data.rootURI, "src/ui.js");
  load(data.rootURI, "src/index.js");
  NBERZoteroPlugin = new NBERZotero.Plugin(data);
  NBERZoteroPlugin.startup();
}

function shutdown(data, reason) {
  if (NBERZoteroPlugin) {
    NBERZoteroPlugin.shutdown();
    NBERZoteroPlugin = null;
  }
}

function install(data, reason) {}

function uninstall(data, reason) {}

function onMainWindowLoad({ window }) {
  if (NBERZoteroPlugin) {
    NBERZoteroPlugin.onMainWindowLoad(window);
  }
}

function onMainWindowUnload({ window }) {
  if (NBERZoteroPlugin) {
    NBERZoteroPlugin.onMainWindowUnload(window);
  }
}
