var {EventEmitter} = require('events')
var Vue = require('vue/dist/vue.common.js')
var VueRouter = require('vue-router')
var Vuex = require('vuex')
var globby = require('globby')
var _ = require('lodash')
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

    var names = []

    this.portals.forEach((portal) => {
      var follows = false
      //console.log(portal)
      if (portal.data.port) {
        follows = portal.data.port.some((p) => {
          try {
            return ('dat://' + DAT_URL_REGEX.exec(p)[1] + '/') === this.account.url
          } catch(e) {
            return false
          }
        })
      }
      names.push( (follows ? '@' : '~') + (portal.data.name || portal.url) )
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

  async createFeedEntry(account, entry, id) {
    var feedEntry = {
      name: account.data.name,
      icon: account.icon,
      id: id,

      timestamp: entry.timestamp,
      editstamp: entry.editstamp,
      message: entry.message,
      quote: entry.quote ? {
        message: entry.quote.message,
        timestamp: entry.quote.timestamp,
        editstamp: entry.quote.editstamp,
      } : null,

      writable: account.dat.writable
    }

    if (entry.media) {
      if ( !account.dat.writable ) try { await pda.download(account.dat.archive, 'media/content/' + entry.media) } catch(e) {}
      feedEntry.media = path.join(account.dat.path, 'media/content/', entry.media)
    }

    if (entry.quote && entry.quote.media) {
      var portal = await this.util.lookup(entry.target)
      if (portal) {
        if ( !portal.dat.writable ) try { await pda.download(portal.dat.archive, 'media/content/' + entry.quote.media) } catch(e) {}
        feedEntry.quote.media = path.join(portal.dat.path, 'media/content/', entry.quote.media)
      }
    }

    if (entry.target && typeof entry.target === 'string') {
      var portal = await this.util.lookup(entry.target)
      if (portal) {
        feedEntry.target = portal.name
      } else {
        feedEntry.target = shortenHash(entry.target)
      }
    }  

    return feedEntry

  }
}

function shortenHash(hash) {
  return hash.substr(0,12) + '..' + hash.substr(hash.length-3,2)
}