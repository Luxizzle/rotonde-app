module.exports = function(self) {
  Vue.component('Root', {
    template: fs.readFileSync('app/scripts/components/routes/root/template.html', 'utf8'),
    data: function() {
      return {
        message: ''
      }
    },
    methods: {
      submit() {
        if (this.message.trim() === '') return

        rotonde.account.submit({
          message: this.message.trim()
        })

        this.message = ''
      }
    }
  }) 
}

