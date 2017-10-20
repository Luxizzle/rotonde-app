module.exports = function(self) {
  Vue.component('load-root', {
    template: fs.readFileSync('app/scripts/components/routes/load/children/root/template.html', 'utf8'),
  }) 
}