class Util {
  constructor(rotonde) {
    this.rotonde = rotonde
    this.fetching = {},
    this.portals = {},
    this.resolved = {},
    this.resolving = {}
  }

  async lookup(url) {

    try {
      url = 'dat://' + DAT_URL_REGEX.exec(url)[1] + '/'

    } catch(e) { /*
      try {
        if (this.resolved[url]) {
          url = this.resolved[url]
        } else if (this.resolving[url]) {
          url = await this.resolving[url]
        } else {
          console.log('RESOLVING URL', url)
          this.resolving[url] = new Promise((resolve, reject) => {
            resolveDatUrl(url)
              .then((hash) => {
                var resolved = 'dat://' + hash + '/';
                this.resolved[url] = resolved
                resolve(url)
              })
              .catch((err) => {
                reject(err)
              })
          })
          url = await this.resolving[url]
          delete this.resolving[url]
        }
      } catch(e) {
        console.error("Couldn't resolve dat:// URL.", e);
      } */
    }

    //if (this.rotonde.portals.has(url)) return this.portals.get(url);
    if (this.portals[url]) return this.portals[url];

    if (this.fetching[url]) return null;

    //console.log('fetching ' + url)

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

    //console.log(path.join(os.tmpdir(), 'lu-rotonde-app', hash))

    var dat = await Dat(path.join(os.tmpdir(), 'lu-rotonde-app', hash), { sparse: true, key: resolved })
    dat.join()

    //console.log(dat.path)
    var activity = emitStream(pda.createFileActivityStream(dat.archive))

    //console.log('fetched ' + url)
    
    this.onPortalChange(url, resolved, dat)
    activity.on('changed', this.onPortalChange.bind(this, url, resolved, dat))
  }

  makePortal(key, data, url, dat) {
    return Object.assign({}, data, {
      port: data.port.map(entry => {
        if (entry.slice(0,6) === 'dat://' && entry.slice(-1) !== '/') entry += '/'

        return entry
      }),
      mention: '@'+data.name,
      key: key,
      url: url,
      dat: dat
    })
  }

  async onPortalChange(key, url, dat) {
    pda.download(dat.archive, 'media/content/icon.svg')
      .then(() => {})
      .catch(() => {})

    try {
      var portal_data = await pda.readFile(dat.archive, 'portal.json')
      if (this.isJSON(portal_data)) {
        var portal = JSON.parse(portal_data)

        this.portals[key] = this.makePortal(key, portal, url, dat)
        delete this.fetching[key]

        this.rotonde.updateFeed()

        //console.log('util-portal update', this.portals[key].name, url)
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