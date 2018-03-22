export default {

  bind () {
    
  },
  
  update (value) {
    this.apply(this.el, value)
  },

  apply (el, value) {
    toggle();
    function toggle () {
      el.style.display = value ? '' : 'none'
    }
  }
}