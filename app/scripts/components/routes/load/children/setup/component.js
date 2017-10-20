module.exports = function() {
  Vue.component('load-setup', {
    template: fs.readFileSync('app/scripts/components/routes/load/children/setup/template.html', 'utf8'),
    data: function() {
      return {
        path: config.get('path'),
        warningMsg: getCurrentRotonde() ? '' : 'No rotonde found here'
      }
    },
    methods: {
      setup: function() {
        config.set('path', this.path)

        if (getCurrentRotonde()) {
          rotonde.account.start();
        }
      },
    },
    watch: {
      path: function() {
        if (!getCurrentRotonde(this.path)) {
          this.warningMsg = 'No rotonde found here'
        } else {
          this.warningMsg = ''
        }
      }
    }
  }) 
}