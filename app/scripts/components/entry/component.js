var moment = require('moment')

module.exports = function() {
  Vue.component('entry', {
    template: fs.readFileSync('app/scripts/components/entry/template.html', 'utf8'),
    props: [
      'entry'
    ],
    data: function() {
      return {
        
      }
    },
    methods: {
      timeAgo(timestamp) {
        return moment(timestamp).fromNow(true)
      }
    }
  })
}