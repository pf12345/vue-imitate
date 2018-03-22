export default {
  bind () {
  	let description = this.description, vm = this.vm, options = vm.options;
   	if(this.el && description.name && description.value) {
   		this.el.addEventListener(description.name, function(e) {
   			let method;
   			if(options.methods && (method = options.methods[description.value]) && typeof method === 'function') {
   				method.call(vm, e);
   			}
   		})
   	} 
  }
}