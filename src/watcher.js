
import Dep from './Dep.js';

// watcher 如何将directive 与 observer进行关联呢？
// 使用观察者／订阅者模式
export default function Watcher(vm, expression, cb) {
	this.cb = cb;
	this.vm = vm;
	this.expression = expression;
	this.depIds = {};

	if (typeof expression === 'function') {
        this.getter = expOrFn;
    } else {
        this.getter = this.parseGetter(expression);
    }

	this.value = this.get();
}

let _prototype = Watcher.prototype;

_prototype.update = function() {
	this.run();
}

_prototype.run = function() {
	let newValue = this.get(), oldValue = this.value;
	if(newValue != oldValue) {
		this.value = newValue;
		this.cb.call(this.vm, newValue);
	}
}

_prototype.addDep = function(dep) {
	// console.log(dep)
	if (!this.depIds.hasOwnProperty(dep.id)) {
		dep.addSub(this);
		this.depIds[dep.id] = dep;
	}
}

_prototype.get = function() {
	Dep.target = this;
	var value = this.getter && this.getter.call(this.vm, this.vm);
	Dep.target = null;
	return value;
}

_prototype.parseGetter = function(exp) {
	if (/[^\w.$]/.test(exp)) return; 

	var exps = exp.split('.');

	return function(obj) {
		let value = '';
		for (var i = 0, len = exps.length; i < len; i++) {
			if (!obj) return;
			value = obj[exps[i]];
		}
		return value;
	}
}
