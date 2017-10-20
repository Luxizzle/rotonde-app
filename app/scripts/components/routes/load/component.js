module.exports = function(self) {
  Vue.component('load', {
    template: fs.readFileSync('app/scripts/components/routes/load/template.html', 'utf8'),
    data: function() {
      return {
        path: config.get('path')
      }
    },
    methods: {
      
    }
  }) 
}