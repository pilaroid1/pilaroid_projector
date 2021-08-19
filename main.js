var fs = require("fs");
var ini = require("ini");
const Pilaroids = require("./logic/pilaroids");
const ImagesManager = require('./logic/imagesManager');
const { app, ipcMain } = require('electron');
const Panel = require("./logic/panels");

dev = false;
// Enable live reload for Electron
if(dev) {
  require('electron-reload')(__dirname, {
    // Note that the path to electron may vary according to the main file
    electron: require(`${__dirname}/node_modules/electron`)
  });
}

var configfile = "config.ini";
// In Dev config.ini is in the same folder
if(fs.existsSync('config.ini')) {
  console.log("Config File: config.ini");
} else {
  // In prod version config.ini will be in app folder, but we want to put it in ressources to make it easy to access
  if(fs.existsSync("resources/config.ini")) {
    configfile = "resources/config.ini"
  } else {
    configfile = "resources/config.ini";
    fs.copyFileSync("resources/app/config.ini", "resources/config.ini");
  }
}
var config = ini.parse(fs.readFileSync(configfile, 'utf-8'));

// Get Filter
filter = {
  "contrast": parseInt(config.filter.contrast),
  "saturate": parseInt(config.filter.saturate),
  "brightness": parseInt(config.filter.brightness)
}

// Get API Credentials
user = {
  "name": config.api.name,
  "password": config.api.password
}

// Callback when a new picture is taken
function newPictures(id, devices) {
  console.log("NEWPICTURE");
  control_panel.window.webContents.send("newPictures", id, devices);
}

// Callback when a device is connected
function newDevice(id, devices) {
  console.log("NEW DEVICE");
  control_panel.window.webContents.send("newDevice", id, devices);
}

// Callback when a device is disconnected
function removeDevice(id, devices) {
  console.log("REMOVE DEVICE");
  control_panel.window.webContents.send("removeDevice", id, devices);
}



// Generate a Pilaroids Manager
var pilaroids = new Pilaroids(user, config.folder.images,
  callback_newpictures=newPictures,
  callback_newdevice=newDevice,
  callback_removedevice=removeDevice
  );

// Discover Pilaroids devices using bonjour
pilaroids.discover();



// Images Manager
saved_images = new ImagesManager(config.folder.images);
saved_images.refresh();

// Create windows
control_panel = new Panel("html/control.html",projector=false,dev=true);
projector_panel = new Panel("html/projector.html",projector=true, dev=false);

// Create windows when application is ready
app.whenReady().then(() => {
  control_panel.createWindow();
  projector_panel.createWindow();
  console.log("Stop");
  // When you close a window, the app will quit
    control_panel.window.on('closed', () => {
      console.log("Saving parameters")
      config.filter.contrast = filter.contrast;
      config.filter.saturate = filter.saturate;
      config.filter.brightness = filter.brightness;
      fs.writeFileSync(configfile, ini.stringify(config));
      app.quit();
    });
});

const ipcBrowser = ipcMain;

/* Control IPC */
ipcBrowser.on("downloadImage", (event, args) => {
  pilaroids.downloadImage(args.ip, args.type, args.filename, imageReturn);
});

function imageReturn(msg) {
  control_panel.window.webContents.send("imageReturn", msg);
}

ipcBrowser.on("resetDevice", (event, args) => {
  //console.log("Reset Device: " + args);
  pilaroids.resetDevice(args, resetReturn);
});

function resetReturn(msg) {
  control_panel.window.webContents.send("resetReturn", msg, pilaroids.devices);
}

/* Projector IPC */
ipcBrowser.on("syncDevices", (event, args) => {
  //console.log(pilaroids.devices)
  control_panel.window.webContents.send("syncDevices", pilaroids.devices);
});

ipcBrowser.on("loadFilter", (event, args) => {

  console.log("Loading filter : " + JSON.stringify(filter));
  control_panel.window.webContents.send("loadFilter", filter);
});

ipcBrowser.on("saveFilter", (event, args) => {
  console.log("Save filter")
  filter =  args;
  console.log(filter)
  projector_panel.window.webContents.send("saveFilter", filter);
});

ipcBrowser.on("video_mapping", (event, args) => {
  console.log("Toggle Video Mapping");
  projector_panel.window.webContents.send("video_mapping");
});

ipcBrowser.on("setProjectorState", (event, args) => {
  projector_panel.window.webContents.send("setProjectorState", projector_panel.state);
});

ipcBrowser.on("setFilter", (event, args) => {
  console.log("Update filter")
  console.log(args);
  //projector_panel.window.webContents.send("setFilter", args)
});

ipcBrowser.on("check_newimages", (event, args) => {
  console.log("Check newimages");
  saved_images.refresh();
  projector_panel.window.webContents.send("check_newimages",saved_images.images);
});


/*
app.on("window-all-closed", function () {

});
*/