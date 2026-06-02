var NBERZoteroPlugin;

function startup(data, reason) {
  Services.scriptloader.loadSubScript(data.rootURI + "src/index.js");
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
