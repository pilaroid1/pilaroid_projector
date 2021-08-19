const fs = require("fs");
const statik = require('node-static');
var _ = require('underscore');
var path = require('path');

// Get Most Recent Image in dir
function getMostRecentFileName(dir) {
    var files = fs.readdirSync(dir);

    // use underscore for max()
    return _.max(files, function (f) {
        var fullpath = path.join(dir, f);

        // ctime = creation time is used
        // replace with mtime for modification time
        return fs.statSync(fullpath).ctime;
    });
}

class ImagesManager {
    constructor(folder) {

        if(folder == "") {
            this.folder = path.join(__dirname, '../../') + "projections";
        } else {
            this.folder = folder;
        }

        this.files = {};
        this.images = {};
        this.checkFolder(this.folder);
        this.checkFolder(this.folder + "/gif/");
        this.checkFolder(this.folder + "/pano/");
        this.checkFolder(this.folder + "/selfie/");

        this.checkFile("banniere.gif");
        this.checkFile("texte_gif.png");
        this.checkFile("texte_panoramique.png");
        this.checkFile("texte_selfie.png");
        this.checkEmptyFolder("gif", "no_gif.gif");
        this.checkEmptyFolder("pano", "no_pano.jpg");
        this.checkEmptyFolder("selfie", "no_selfie.jpg");

        var images_file = new statik.Server(this.folder + "/");

        // Create a loopback only server to get photo file on the web interface
        require('http').createServer(function (request, response) {
            request.addListener('end', function () {
                //
                // Serve files!
                //
                images_file.serve(request, response);
            }).resume();
        }).listen(8888,"127.0.0.1");
    }

    // Check if file exists and if not, copy the default file
    checkFile(name) {
        if(!fs.existsSync(this.folder + "/" + name)) {
            if(fs.existsSync("default/" + name)) {
                fs.copyFileSync("default/" + name, this.folder + "/" + name)
            } else {
                fs.copyFileSync("resources/app/default/" + name, this.folder + "/" + name)
            }
        }
    }

    // Check if folder is empty and if not, copy the default file
    checkEmptyFolder(name, file) {
        if(fs.readdirSync(this.folder + "/" + name).length == 0) {
            if(fs.existsSync("default/" + file)) {
                fs.copyFileSync("default/" + file, this.folder + "/" + name + "/" + file);
            } else {
                fs.copyFileSync("resources/app/default/" + file, this.folder + "/" + name + "/" + file);
            }
        }
    }

    // Check if folder exists and if not, create it
    checkFolder(folder) {
        if(fs.existsSync(folder)) {
            console.log("--> Folder Exists : " + folder);
        } else {
            fs.mkdirSync(folder, (err) => {
                console.log("--> Create folder: " + folder);
                if (err) {
                    throw err;
                }
            });
        }
    }

    // Get the most recent file in all photo folders
    refresh() {
        var gif_file = getMostRecentFileName(this.folder + "/gif/");
        var pano_file = getMostRecentFileName(this.folder + "/pano/");
        var selfie_file = getMostRecentFileName(this.folder + "/selfie/");

        if(gif_file == -Infinity){
            this.images.gif = undefined;
        } else {
            this.images.gif = gif_file;
        }
        if(pano_file == -Infinity){
            this.images.pano = undefined;
        } else {
            this.images.pano = pano_file;
        }
        if(selfie_file == -Infinity){
            this.images.selfie = undefined;
        } else {
            this.images.selfie = selfie_file;
        }
    }
}

module.exports = ImagesManager