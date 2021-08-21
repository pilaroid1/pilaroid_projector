// https://github.com/futomi/node-dns-sd

http = require("http");
const dns = require('dns');
const fs = require("fs");
class Pilaroids {
    constructor(user,
        images_folder,
        callback_newpictures=callback_newpictures,
        callback_newdevice=callback_newdevice,
        callback_removedevice=callback_removedevice) {
        this.images_folder = images_folder;
        this.WebSocketManager = require('ws'); // WebSocket Object
        this.devices = []; // List of devices
        this.websockets = []
        this.reconnecting_ip = [];
        this.user = user; // User credentials
        this.scan = false; // Scanning for devices
        this.callback_newpictures = callback_newpictures; // Callback function to call when a new picture is available
        this.callback_newdevice = callback_newdevice; // Callback function to call when a new device is found
        this.callback_removedevice = callback_removedevice; // Callback function to call when a device is removed
        // Check websocket every seconds
        setInterval(() => this.check(), 1000);
    }

    setIp(err, ip) {
        if(!err) {
            this.ip = ip;
            this.add(this.name, this.ip);
        }
    }

    // https://melvingeorge.me/blog/check-if-string-is-valid-ip-address-javascript
    checkIfValidIP(str) {
        // Regular expression to check if string is a IP address
        const regexExp = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/gi;
        return regexExp.test(str);
    }

    // Add a device
    add(name, ip=undefined) {
        if(!this.checkIfValidIP(ip)) {
            // Get IP from DNS
            console.log("Invalid IP check it");
            dns.lookup(name, (err, addresses) => this.setIp(err, addresses))
            return;
        }
        // Check if the device exists before adding it
        for(let i = 0; i < this.devices.length; i++) {
            if(this.devices[i].ip == ip) {
                console.log(name + " already exists");
                return;
            }
        }

        this.connect(ip);
    }

       // Add a new websocket
    connect(ip) {
        //console.log("Checking websockets poll")
        let new_websocket = true;
        for(let i = 0; i < this.devices.length; i++) {
            if("ws://" + ip + "/websocket" == this.devices[i].url){
                new_websocket = false;
            }
        }
        if(new_websocket) {
            console.log("New Websocket Found: " + ip);
            let ws = new this.WebSocketManager("ws://" + ip + "/websocket")
            ws.ip = ip;
            //ws.on("close", event => this.onclose(event, ws));
            ws.on("message", msg => this.onmessage(msg, ws));
            ws.on("error", event => console.log("Websocket Error: " + event));
            //ws.on("error", event => this.onclose(event, ws));
            this.websockets.push(ws);
            this.devices.push({"ip":ip});
        } else {
            console.log("Websocket already added");
        }
    }

    // Start Bonjour Discovery to find Pilaroids
    discover() {
        // if this.scan is false, start scanning
        if(!this.scan) {
            console.log("Start discovery for Pilaroid");
            // Start scanning
            this.scan = true;
            // Create Bonjour Discovery object
            var bonjour = require("bonjour")();
            // Add a listener to the bonjour object with type pilaroid
            bonjour.find({type: "pilaroid"}, (service) => this.add(service.name, service.referer.address));
        } else {
            // If this.scan is true, don't do anything
            console.log("Already scanning for Pilaroids");
        }
    }

    onclose(event, ws) {
        //console.log("Websocket close");
        console.log(event);
    }

    onmessage(msg, ws) {
        //console.log("WebsocketMessage: " + ws.ip + " " + msg);
        try {

            msg = (JSON.parse(msg.toString()));
            //console.log(msg);
            if(msg.auth !== undefined) {
                if(msg.auth == false) {
                    console.log("Send password...")
                    ws.send(this.user.password);
                }
                if(msg.auth == true) {
                    // Search a device with the same IP
                    if((msg.event == "login") || (msg.event == "sync")) {
                        for(let i = 0; i < this.devices.length; i++) {
                            if(this.devices[i].ip == ws.ip) {
                                this.devices[i] = msg
                                // Loop thought the list of reconnecting devices
                                for(let j = 0; j < this.reconnecting_ip.length; j++) {
                                    // Remove ws.ip in the list of reconnecting devices
                                    if(this.reconnecting_ip[j] == ws.ip) {
                                        this.reconnecting_ip.splice(j, 1);
                                    }
                                }
                                var id = i;
                                this.callback_newdevice(id, this.devices);
                            }
                        }
                    }

                    if(msg.event == "newpictures") {
                        console.log("New Pictures!")
                        var id = -1
                        for(let i = 0; i < this.devices.length; i++) {
                            if(this.devices[i].ip == ws.ip) {
                                this.devices[i] = msg
                                id = i;
                            }
                        }
                        if(id != -1){
                            this.callback_newpictures(id, this.devices);
                        }
                    }
                }
            }
        } catch(e) {
            console.log("Error: " + e);
        }
    }

    // Check if there are any websockets that are not connected, reconnect them.
    check() {
        for(let i = 0; i < this.websockets.length; i++) {
            //console.log("Checking websockets health....")
            //console.log("Websocket State: " + this.websockets[i].readyState);
            if(this.websockets[i].readyState > 1) {
                //console.log("Websocket: " + this.devices[i].ip + " closed regenerate it")
                this.websockets[i].terminate();
                let ip = this.websockets[i].ip;
                // Remove websocket from array
                this.websockets.splice(i, 1);
                this.devices.splice(i, 1);
                console.log("Remove Operation...");
                // Loop thought the list of reconnecting devices
                var new_reconnectingdevices = true;
                for(let j = 0; j < this.reconnecting_ip.length; j++) {
                    // Add ws.ip in the list of reconnecting devices
                    if(this.reconnecting_ip[j] == ip) {
                        new_reconnectingdevices = false;
                    }
                }
                if(new_reconnectingdevices) {
                    var id = i;
                    this.reconnecting_ip.push(ip);
                    this.callback_removedevice(id, this.devices);
                }

                //console.log(this.devices);
                this.connect(ip);
            } else {
                // Send a ping to the websocket
                if(this.websockets[i].readyState == 1) {
                    //console.log("Ping : " + this.devices[i].ip);
                    this.websockets[i].ping();
                }
            }
        }
    }

    // Download an image from an url to a folder
    downloadImage(ip, type, filename, callback) {
        var url = "http://" + ip + "/images/" + filename;
        var path = this.images_folder + "/" + type + "/" + filename;
        console.log("Downloading: " + url + " to " + path);
        // Create a new file

        // Create a request object
        var request = http.get(url, (response) => {
            // Check if response is 404
            if(response.statusCode == 404) {
                console.log("404: " + url);
                callback("no", path);
                return;
            }
            // When the response is ready
            var file = fs.createWriteStream(path);
            response.pipe(file);
            // When the download is complete
            file.on("finish", () => {
                file.close();
                callback("ok", path);
            });
        });

        // When an error occurs
        request.on("error", (e) => {
            console.log("Error: " + e);
            callback("error", path);
        });
    }

    resetDevice(ip, response_callback) {
        //Make a GET request to the device with basic authentication
        var options = {
            hostname: ip,
            port: 80,
            path: "/deleteall",
            method: "GET",
            auth: this.user.name + ":" + this.user.password,
        }
        console.log("Reset Device: " + ip);
        //console.log(options);
        var req = http.request(options, res => {
            console.log(res.statusCode);
            //Loop thought in this.devices
            for(let i = 0; i < this.devices.length; i++) {
                if(this.devices[i].ip == ip) {
                    this.devices[i].last_image.filename = ""
                    this.devices[i].last_image.timestamp = ""
                }
            }
            response_callback(res.statusCode);
        });
        // When an error occurs
        req.on("error", e => {
            console.log("Error: " + e);
            response_callback("error");
        });

        req.end();
    }
}

module.exports = Pilaroids;
