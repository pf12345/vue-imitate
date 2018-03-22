import { extend } from './util.js';
import Watcher from './watcher.js';

export default function Directive(vm, el, description) {
	this.vm = vm;
	this.el = el;
	this.description = description;
	this.expression = description.token ? description.token.value : '';
}

Directive.prototype._bind = function() {
	extend(this, this.description.def);
	if(this.bind) {
		this.bind();
	}

	var self = this, watcher = new Watcher(this.vm, this.expression, function() {
		self.update(watcher.value);
	})

	if(this.update) {
		this.update(watcher.value);
	}
}