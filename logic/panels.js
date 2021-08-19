const { BrowserWindow } = require('electron')

class Panel {
    constructor(main_file, projector=false, dev_mode=true) {
        this.main_file = main_file;
        this.projector = projector;
        this.window = undefined;
        this.dev_mode = dev_mode;
        this.state = {};
        if (this.projector == true) {
            this.x = 2000;
            this.y = 100;
            this.fullscreen = true;
        } else {
            this.x = 0;
            this.y = 0;
            this.fullscreen = true;
        }
    }

    getState() {
        return this.state;
    }

    createWindow() {
        this.window = new BrowserWindow({
            width: 800,
            height: 600,
            x:this.x,
            y:this.y,

            fullscreen:this.fullscreen,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.window.loadFile(this.main_file);
        console.log(this.main_file);
        console.log(this.dev_mode);
        this.window.setMenuBarVisibility(this.dev_mode);
    }
}

module.exports = Panel;

