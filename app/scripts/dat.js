var ram = require('random-access-memory')
var raf = require('random-access-file')
var DatNode = require('dat-node')
var pda = require('pauls-dat-api')
var emitStream = require('emit-stream')
var resolve = require('dat-link-resolve')

var DAT_URL_REGEX = /^(?:dat:\/\/)?([0-9a-f]{64})/i

function Dat(store = raf, opts = {}) {
  return new Promise((resolve, reject) => {
    DatNode(store, opts, function(err, dat) {
      if (err) return reject(err);

      resolve(dat)
    })
  })
}

function resolveDatUrl(url) {
  return new Promise((res, reject) => {
    resolve(url, (err, key) => {
      if (err) return reject(err);

      //console.log('resolve', key)

      res(key)

      
    })
  })
}