var fs = require("fs");
var ini = require("ini");
const Pilaroids = require("./logic/pilaroids");
const ImagesManager = require('./logic/imagesManager');
const { app, ipcMain } = require('electron');
const Panel = require("./logic/panels");
var path = require('path');

dev = false;
// Enable live reload for Electron
if(dev) {
  require('electron-reload')(["{__dirname}/*.js", "{__dirname}/logic/*.js"
  ], {
    // Note that the path to electron may vary according to the main file
    electron: require(`${__dirname}/node_modules/electron`)
  });
}

app_path = path.join(__dirname, '../../');
console.log("Current Directory: " + __dirname);
console.log("App Path: " + app_path);

var configfile = "config.ini";
// In Dev config.ini is in the same folder
if(fs.existsSync('config.ini')) {
  console.log("Config File: config.ini");
} else {
  // In prod version config.ini will be in app folder, but we want to put it in ressources to make it easy to access
  if(fs.existsSync("resources/config.ini")) {
    configfile = app_path + "resources/config.ini"
  } else {
    configfile = app_path + "resources/config.ini";
    fs.copyFileSync("resources/app/config.ini", "resources/config.ini");
  }
}
var config = ini.parse(fs.readFileSync(configfile, 'utf-8'));
console.log("Configuration --> " + configfile);
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
  console.log("NEW PICTURE");
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

  // When you close a window, the app will quit
    control_panel.window.on('closed', () => {
      console.log("Saving parameters")
      saveFilterToINI();
      app.quit();
    });
});

function saveFilterToINI() {
  config.filter.contrast = filter.contrast;
  config.filter.saturate = filter.saturate;
  config.filter.brightness = filter.brightness;
  fs.writeFileSync(configfile, ini.stringify(config));
}

const ipcBrowser = ipcMain;

/* Control IPC */
ipcBrowser.on("downloadImage", (event, args) => {
  pilaroids.downloadImage(args.ip, args.type, args.filename, imageReturn);
});

ipcBrowser.on("openConfig", (event, args) => {
  const { exec} = require('child_process');
  exec(configfile, (error, stdout, stderr) => {
    if (error) {
        console.log(`error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
    }
  });
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

  console.log("BACKEND Filter --> FRONTEND Filter : " + JSON.stringify(filter));
  control_panel.window.webContents.send("loadFilter", filter);
});

ipcBrowser.on("saveFilter", (event, args) => {
  filter =  args;
  console.log("FRONTEND Filter --> BACKEND Filter :" + JSON.stringify(filter))
  saveFilterToINI();
  projector_panel.window.webContents.send("saveFilter", filter);
});

ipcBrowser.on("video_mapping", (event, args) => {
  console.log("Toggle Video Mapping");
  projector_panel.window.webContents.send("video_mapping");
});

ipcBrowser.on("nextSlide", (event, args) => {
  console.log("Show next slide");
  projector_panel.window.webContents.send("nextSlide");
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
  console.log("Check for new images");
  saved_images.refresh();
  projector_panel.window.webContents.send("check_newimages",saved_images.images);
});


/*
app.on("window-all-closed", function () {

});
*/