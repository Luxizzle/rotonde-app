var lowdb = require('lowdb')
var FileSyncAdapter = require('lowdb/adapters/FileSync')
var path = require('path')
var os = require('os')
var fs = require('fs')

class Config {
  constructor(self) {
    var cpath = path.join(os.homedir(), 'lu-config');
    if(!fs.existsSync(cpath)) { fs.mkdir(cpath); }
    this.db = lowdb(new FileSyncAdapter(path.join(os.homedir(), 'lu-config', 'rotonde-app.json')))
    
    this.db
      .defaults({
        path: path.join(os.homedir(), 'Rotonde-Client'),
      })
      .write()
  }

  get(path) {
    return this.db.get(path).value()
  }

  set(path, value) {
    this.db.set(path, value).write()
  }
}
var config = new Config()
