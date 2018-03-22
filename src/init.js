import { extend } from './util.js';
import { observer } from './Observer.js';

export default function vueImitate(options) {
	this.options = options || {};
	this.selector = options.el ? ('#' + options.el) : 'body';
	this.data = typeof options.data === 'function' ? options.data() : options.data;
	this.el = document.querySelectorAll(this.selector)[0];
	this.template = this.el.innerHTML;

	this._directives = [];

	this.initData();
	this.compile();
}


vueImitate.prototype.initData = function() {
	let data = this.data, self = this;

	extend(this, data);

	Object.keys(data).forEach((key) => {
		Object.defineProperty(self, key, {
			set: function(newVal) {
				self.data[key] = newVal;
			},
			get: function() {
				return self.data[key];
			}
		})
	})
		
	observer(this.data);
}