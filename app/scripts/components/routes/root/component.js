module.exports = function(self) {
  Vue.component('Root', {
    template: fs.readFileSync('app/scripts/components/routes/root/template.html', 'utf8')
  }) 
}

