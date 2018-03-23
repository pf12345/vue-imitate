export default {

  bind () {
    
  },
  
  update (value) {
    this.apply(this.el, value)
  },

  apply (el, value) {
    el.style.display = value ? '' : 'none'
  }
}