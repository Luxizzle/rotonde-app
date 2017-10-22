var horsey = require('horsey')

module.exports = function() {
  Vue.component('input-box', {
    template: fs.readFileSync('app/scripts/components/input-box/template.html', 'utf8'),
    data: function() {
      return {
        message: '',
        target: '',
      }
    },
    methods: {
      inputHandler(e) {
        if (e.keyCode === 13 && e.shiftKey) {
          e.preventDefault();
          this.submit();
        }
      },
      submit() {
        if (this.message.trim() === '') return

        this.message = ''
        this.target = ''

        rotonde.account.submit({
          message: this.message.trim(),
          target: this.target.trim() === '' ? undefined : this.target.trim()
        })
      }
    },
    mounted() {
      this.$nextTick(() => {
        var input_message = this.$refs.message
        var input_target = this.$refs.target

        function renderItem(li, suggestion) {
          var image = '<img style="width: 20px; height: 20px; margin-top: 10px;" src="'+ path.join(suggestion.dat.path, 'media/content/icon.svg') +'" /> ';
          li.innerHTML = image + suggestion.name + ' (' + shortenHash(suggestion.key) + ' - ' + shortenHash(suggestion.url) + ')';
        }

        horsey(input_message, {
          source(data, done) {
            var portals = Array.from(
              Object.entries(rotonde.util.portals)
                .map(([key, value]) => value)
              )


            //console.log(portals)

            done(null, [{ 
              list: portals
            }] )
          },  
          getText: 'name',
          getValue: 'mention',
          renderItem,
          anchor: '@'
        })

        horsey(input_target, {
          source(data, done) {
            var portals = Array.from(
              Object.entries(rotonde.util.portals)
                .map(([key, value]) => value)
              )
              
            done(null, [{ 
              list: portals
            }] )
          },  
          getText: 'url',
          getValue: 'name',
          renderItem
        })
      })
    }
  })
}