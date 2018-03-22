export default {
	bind() {
		let self = this, isNumber, oldValue;
		if(this.el) {
			oldValue = this.vm[this.description.value];
			isNumber = typeof oldValue === 'number';
			this.el.value = oldValue;
			this.el.addEventListener('input', function() {
				self.vm[self.description.value] = isNumber ? Number(self.el.value) : self.el.value;
			})
		}
	},
	update(value) {
		if(this.el && this.el.value != value) {
			this.el.value = value;
		}
	}
}