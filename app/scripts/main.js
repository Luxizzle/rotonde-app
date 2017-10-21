var {EventEmitter} = require('events')
var Vue = require('vue/dist/vue.common.js')
var VueRouter = require('vue-router')
var Vuex = require('vuex')
var globby = require('globby')
var _ = require('lodash')
var fs = require('fs-extra')
var pretty = require('prettier-bytes')
var shortid = require('shortid')
var pTimeout = require('p-timeout')

var ipc = require('electron').ipcRenderer

Vue.use(VueRouter)
Vue.use(Vuex)

var paths = globby.sync('./scripts/components/**/*.js', {cwd: __dirname})
paths.forEach(path => {
  console.log('Loading component file ' + path)
  require(path)()
})

var feedVersion = 0

class Rotonde extends EventEmitter {
  constructor() {
    super()

    console.log('Loading rotonde...')

    this.resolvedNames = new Map()
    this.unresolvedNames = []
    this.resolving = false

    this.router = new VueRouter({
      routes: [
        { path: '/', redirect: '/load'},
        { path: '/load', component: Vue.options.components['load'],
          children: [
            { path: '', component: Vue.options.components['load-root'] },
            { path: 'setup', component: Vue.options.components['load-setup'] },
          ] 
        },
        { path: '/home', component: Vue.options.components['Root'] }
      ]
    })

    this.router.beforeEach((to, from, next) => {
      console.log('beforeEach', from, to)
      if (to.path === '/load' && this.store.state.loaded) return next(false);

      console.log('noguard')
      next()
    })

    this.store = new Vuex.Store({
      state: {
        loaded: false,
        data: {
          name: 'no_name',
          desc: 'no_desc',
          site: 'no_site',
          icon: ''
        },
        key: 0,
        peers: 0,
        speed: {
          up: 0,
          down: 0
        },
        feed: [],
        portals: []
      },
      mutations: {
        set: (state, payload) => _.set(state, payload.path, payload.value),
        name: (state, name) => state.data.name = name,
        desc: (state, desc) => state.data.desc = desc,
        site: (state, site) => state.data.site = site,
        icon: (state, icon) => state.data.icon = icon,
        peers: (state, peers) => state.peers = peers,
        speeds: (state, s) => state.speed = s,
        feed: (state, feed = []) => state.feed = feed,
        portals: (state, portals) => state.portals = portals,
        key: (state, key) => state.key = key
      }
    })

    this.vue = new Vue({
      el: '#app',
      router: this.router,
      store: this.store,
      methods: {
        close() {
          ipc.send('close')
        },
        minimize() {
          ipc.send('minimize')
        },
        pretty(b) {
          return pretty(b)
        }
      }
    })

    this.start()
  }

  async start() {
    this.config = config

    this.util = new Util(this)

    this.portals = new Map()

    this.account = new Account(this)

    console.log('Starting account')

    await this.account.start()

    console.log('Done')

    //this.router.push('/home')

  }

  async updatePortals() {
    var urls = this.account.getPortals()

    var psl = []
    urls.forEach((url) => {
      if (!DAT_URL_REGEX.exec(url)) return;
      url = 'dat://' + DAT_URL_REGEX.exec(url)[1] + '/'

      if (this.portals.has(url)) return;

      console.log('Adding portal ' + url)

      var portal = new Portal(this, url)
      psl.push(portal.start())
      this.portals.set(url, portal)
    })

    await Promise.all(psl)

    this.portals.forEach((portal, key) => {
      if (urls.some((url) => url === portal.url)) return;

      console.log('Removing portal' + portal.url)

      portal.dat.close()

      this.portals.delete(key)
    })

    var names = Array.from(this.portals).map((portal) => {
      //console.log(portal[1])
      return portal[1].data.name || portal[1].url
    })

    //console.log(names)

    this.store.commit('portals', names)

    return this.portals
  }

  async updateFeed() {
    const ver = feedVersion++
    var feed = []
    feed = feed.concat(await this.account.getFeed())

    var psl = []
    
    this.portals.forEach((portal) => {
      //console.log(portal)
      var ps = portal.getFeed()
        .then((f) => {
          feed = feed.concat(f)
        })
      psl.push(ps)
    })

    await Promise.all(psl)

    feed = feed.sort((a, b) => b.timestamp - a.timestamp)

    this.store.commit('feed', feed)

    return feed
  }

  resolveName(url) {
    return new Promise((resolve, reject) => {
      if (this.resolvedNames.has(url)) return resolve(this.resolvedNames.get(url));
      if (this.unresolvedNames.find(u => u === url)) return resolve(url);
  
      this.unresolvedNames.push(url)

      resolve(url)
  
      if (this.resolving) return
      this.resolving = true
      
      var _this = this
      
      async function startLoop() {
        while (_this.resolving) {
          //console.log('loop resolve', _this.unresolvedNames.length)

          await loop()
          
          if (_this.unresolvedNames.length === 0) {
            _this.resolving = false

            console.log('finished resolve loop')
            console.log(_this.resolvedNames)

            break;
          }
        }
        
        async function loop(i) {
          var url = _this.unresolvedNames.pop()
          //console.log('resolving', url)
          try {
            //var hash = await resolveDatUrl(url)

            //url = 'dat://' + hash + '/'
            var tmppath = path.join(os.tmpdir(), 'lu-rotonde-app', 'resolve-'+shortid.generate( ))
            fs.ensureDirSync(tmppath)
        
            var dat = await Dat(tmppath, { key: url })
            //console.log(dat)
            //dat.join()
            var portalPromise = (new Promise((res) => {
              dat.join((err) => {
                dat.archive.readFile('portal.json', 'utf8', (err, file) => {
                  res(file)
                })
              })
            }))
            var portal = await pTimeout(portalPromise, 1000 * 10)
            //var portal = await portalPromise
            

            if (!portal) return

            //await pda.download(dat.archive, 'portal.json')
            //var portal = await pda.readFile(dat.archive, 'portal.json')
            var data = JSON.parse(portal)

            //console.log(data)
      
            if (data.name) {
              console.log('resolved name!', data.name)
              _this.resolvedNames.set(url, data.name)
            }

            dat.leave()
            dat.close()

            await _this.updateFeed()

          } catch(e) {console.warn(e)}

          return
        }
      }

      startLoop()

      
    })
    
  }

  async getName(url) {

    if (DAT_URL_REGEX.exec(url)) {
      url = 'dat://' + DAT_URL_REGEX.exec(url)[1] + '/'
    } else { // this literally already runs out of memory...
      //var hash = await resolveDatUrl(url)
      //url = 'dat://' + hash + '/'
    }

    //console.log('getName', url)

    if (url === this.account.url) return this.account.data.name;

    var portal = this.portals.get(url)

    
    if (portal) {
      if (portal.data.name) return portal.data.name;
      return '?' + portal.url
    }

    return this.resolveName(url)
  }

  async createFeedEntry(account, entry) {
    var feedEntry = {
      name: account.data.name,
      icon: account.icon,

      timestamp: entry.timestamp,
      editstamp: entry.editstamp,
      message: entry.message,
      qoute: entry.qoute ? entry.qoute.message : null,

      writable: account.dat.writable
    }

    if (entry.target && typeof entry.target === 'string') {
      var portal = this.util.lookup(entry.target)
      if (portal) {
        feedEntry.target = portal.name
      } else {
        feedEntry.target = entry.target.substr(0,12) + '..' + entry.target.substr(entry.target.length-3,2)
      }
    }  

    return feedEntry

  }
}