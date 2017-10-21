class Util {
  constructor(rotonde) {
    this.rotonde = rotonde
    this.fetching = {},
    this.portals = {}
  }

  lookup(url) {
    if (this.portals[url]) return this.portals[url]
    if (this.fetching[url]) return null;

    console.log('fetching ' + url)

    this.fetching[url] = true
    this.fetch(url)

    return null
  }

  async fetch(url) {
    var resolved = url;

    if(url.slice(0,6) === 'dat://'){
      try{
        var hash = await resolveDatUrl(url)
        resolved = 'dat://' + hash + '/';
      }catch(e){
        console.error("Couldn't resolve dat:// URL.", e);
      }
    }

    var dat = await Dat(path.join(os.tmpdir(), 'lu-rotonde-app', hash), { sparse: true, key: resolved })
    dat.join()
    var activity = emitStream(pda.createFileActivityStream(dat.archive))

    console.log('fetched ' + url)
    
    this.onPortalChange(url, resolved, dat)
    activity.on('changed', this.onPortalChange.bind(this, url, resolved, dat))
  }

  makePortal(data, url, dat) {
    return Object.assign({}, data, {
      port: data.port.map(entry => {
        if (entry.slice(0,6) === 'dat://' && entry.slice(-1) !== '/') entry += '/'

        return entry
      }),   
      url: url,
      dat: dat
    })
  }

  async onPortalChange(key, url, dat) {
    try {
      var portal_data = await pda.readFile(dat.archive, 'portal.json')
      if (this.isJSON(portal_data)) {
        var portal = JSON.parse(portal_data)

        delete this.fetching[key]
        this.portals[key] = this.makePortal(portal, url, dat)

        this.rotonde.updateFeed()

        console.log('util-portal update', this.portals[key].name, url)
      } else {
        console.log('Malformed JSON')
      }
    } catch(e) {
      console.error("Error reading remote portal.json", e);
    }
  }

  isJSON(data) {
    try {
      JSON.parse(data)
      return true
    } catch(e) {
      return false
    }
  }
} 