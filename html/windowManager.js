class windowManager {
    constructor(projector=false) {

        // Create Interprocess communication channel
        this.ipc = require('electron').ipcRenderer;

        // Check if instance is on a projector
        this.projector = projector;

        /* Filter */
        this.filter = {
            "contrast": 100,
            "saturate": 100,
            "brightness": 100
        }

        this.mapping = false;
        this.images = [];
        this.devices = [];

        /* Mapping */
        if(this.projector) {
            this.id_selfie = document.getElementById("selfie");
            this.id_panoramique = document.getElementById("panoramique");
            this.id_gif = document.getElementById("gif");
            this.id_banniere = document.getElementById("banniere");
            this.id_texte = document.getElementById("texte");
            this.images_mapper = Maptastic("selfie", "panoramique", "gif", "banniere", "texte");
            this.id_selfie_layer =  this.images_mapper.getLayers()[0]
            this.id_panoramique_layer =  this.images_mapper.getLayers()[1]
            this.id_gif_layer =  this.images_mapper.getLayers()[2]
            this.id_banniere_layer =  this.images_mapper.getLayers()[3]
            this.id_texte_layer =  this.images_mapper.getLayers()[4]
        }

        // InterProcess Communication
        this.ipc.on('video_mapping', (event, args) => this.toggleMapping());
        this.ipc.on("syncDevices", (event,args) => this.syncDevices(args));
        this.ipc.on("setFilter", (event, args) => this.setFilter(args));
        this.ipc.on("loadFilter", (event, args) => this.loadFilter(args));
        this.ipc.on("saveFilter", (event, args) => this.saveFilter(args));
        this.ipc.send("loadFilter");
        if(this.projector == false) {
            console.log("Syncing Devices");
            this.ipc.send("syncDevices");
        }
    }

    // Get device by type and id
    selectDevice(type, id) {
        let devices_bytype = this.devices.filter(device => device.type == type)
        return devices_bytype[id];
    }

    syncDeviceByName(device){
        // Loop thought array this.devices
        for(let i = 0; i < this.devices.length; i++){
            if(this.devices[i].name == device.name){
                this.devices[i].last_image.filename = device.last_image.filename;
                this.devices[i].last_image.timestamp = device.last_image.timestamp;
            }
        }
    }

    getnbDevice(type) {
        let devices_bytype = this.devices.filter(device => device.type == type)
        return devices_bytype.length;
    }

    // Scan Pilaroids
    scanPilaroids() {
        if(this.projector == false){
            //console.log(".... Scanning ....");
            this.ipc.send("getPilaroids");
        }
    }

    // get pilaroids devices
    syncDevices(devices) {
        if(this.projector == false){
            //console.log(devices);
            this.devices = devices;
        }
    }

    // Toggle video-mapping
    toggleMapping() {
        console.log("toggleMapping")
        this.mapping = !this.mapping;

        if(this.projector) {
            console.log("Config Mapping")
            this.images_mapper.setConfigEnabled(this.mapping);
        } else {
            if(!this.mapping) {
                $("#video_mapping").removeClass("alert");
                $("#video_mapping").addClass("success");
            } else {
                $("#video_mapping").removeClass("success");
                $("#video_mapping").addClass("alert");
            }
            this.ipc.send("video_mapping");
        }
    }

    // Load filter (contrast/saturate/brightness)
    loadFilter(filter) {
        console.log("Loading filter : " + JSON.stringify(filter));
        this.filter = filter
        if(this.projector) {
            this.setFilter("contrast", this.filter.contrast);
            this.setFilter("saturate", this.filter.saturate);
            this.setFilter("brightness", this.filter.brightness);
        } else {
            $("#contrast").text(this.filter.contrast + "%");
            $("#sature").text(this.filter.saturate + "%");
            $("#brightness").text(this.filter.brightness + "%");
        }
        this.ipc.send("saveFilter", this.filter);
    }

    // Set filter (contrast/saturate/brightness)
    setFilter(type, value) {
        if(!this.projector) {
            console.log("Set new value to filter")
            if(value == undefined){
                this.filter[type] = 100;
            } else {
                this.filter[type] = this.filter[type] + value;
            }
            $("#" + type).text(this.filter[type] + "%");
            console.log(this.filter)
            this.ipc.send("saveFilter", this.filter);
        }
    }

    // Save filter (contrast/saturate/brightness)
    saveFilter(filter) {
        console.log("Save Filter sent")
        if(this.projector) {
            console.log("Change Filter")
            this.filter = filter;
            document.getElementById("selfie").style.filter = "contrast("+this.filter.contrast+"%) saturate("+this.filter.saturate+"%) brightness("+this.filter.brightness+"%)";
            document.getElementById("gif").style.filter = "contrast("+this.filter.contrast+"%) saturate("+this.filter.saturate+"%) brightness("+this.filter.brightness+"%)";
            document.getElementById("panoramique").style.filter = "contrast("+this.filter.contrast+"%) saturate("+this.filter.saturate+"%) brightness("+this.filter.brightness+"%)";
            document.getElementById("banniere").style.filter = "contrast("+this.filter.contrast+"%) saturate("+this.filter.saturate+"%) brightness("+this.filter.brightness+"%)";
        }
    }
}

