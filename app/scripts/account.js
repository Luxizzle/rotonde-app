class Account {
  constructor(rotonde) {
    this.rotonde = rotonde
    this.url = ''

    this.data = {}
    this.icon = ''
  }

  async start() {
    if (!getCurrentRotonde()) {
      this.rotonde.router.push('/load/setup')
    } else {
      await this.setup()
      this.rotonde.router.push('/home')

      setInterval(() => {
        this.rotonde.updateFeed()
      }, 1000 * 30) // Update feed every 30 seconds for time and stuff
    
    }
  }

  async setup() {
    this.dat = await Dat(config.get('path'))
    this.hash = await resolveDatUrl('dat://' + this.dat.key.toString('hex') + '/')
    this.url = 'dat://' + this.hash + '/'

    this.dat.importFiles({watch: true})

    this.stats = this.dat.trackStats()

    setInterval(() => {
      this.rotonde.store.commit('speeds', {
        up: this.stats.network.uploadSpeed,
        down: this.stats.network.downloadSpeed
      })
    }, 500)

    this.activity = emitStream(pda.createFileActivityStream(this.dat.archive))
    this.activity.on('changed', this.onChange.bind(this))

    this.swarm = this.dat.join()
    this.swarm.on('connection', this.onConnection.bind(this))

    this.rotonde.store.commit('set', {
      path: 'loaded',
      value: true
    })

    this.rotonde.store.commit('key', this.dat.key)

    this.onChange()

  }

  onConnection(con, info) {
    this.rotonde.store.commit('set', {
      path: 'peers',
      value: this.swarm.connected
    })
  }

  async onChange() {
    try {
      this.icon = await pda.readFile(this.dat.archive, 'media/content/icon.svg') || ''
    } catch(e) {}

    try {
      var data = await pda.readFile(this.dat.archive, 'portal.json')
      //console.log(data)
      
      this.data = JSON.parse(data)

      this.rotonde.store.commit('name', this.data.name)
      this.rotonde.store.commit('desc', this.data.desc)
      this.rotonde.store.commit('site', this.data.site)
      this.rotonde.store.commit('icon', this.icon)
      
    } catch(e) {
      console.log(e)
      // give some kind of error notification here
    }

    this.rotonde.updatePortals()

    this.rotonde.updateFeed()
  }

  getFeed() {
    if (!this.data || !this.data.feed) return [];

    var feed = []
    this.data.feed.forEach((entry) => {
      feed.push({
        name: this.data.name,
        icon: this.icon,
        timestamp: entry.timestamp,
        message: entry.message,
        writable: true
      })
    })

    //console.log(feed)

    return feed
  }

  getPortals() {
    if (!this.data || !this.data.port) return [];

    return this.data.port
  }
}

function getCurrentRotonde(p = config.get('path')) {
  var exists = fs.existsSync(p)
  if (exists) {
    if (!fs.existsSync(path.join(p, 'dat.json'))) return false
    if (!fs.existsSync(path.join(p, 'portal.json'))) return false

    return true
  }

  return false
}