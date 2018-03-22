import Dep from './Dep.js';

export function Observer(data) {
	this.data = data;
	Object.keys(data).forEach((key) => {
		defineProperty(data, key, data[key]);
	})
}

export function observer(data, vm) {
	if(!data || typeof data !== 'object') {
		return;
	}

	let o = new Observer(data);
	return o;
}

function defineProperty(data, key, val) {
	let _value = data[key];
	let childObj = observer(_value);

	let dep = new Dep(); //生成一个调度中心，管理此字段的所有订阅者
	Object.defineProperty(data, key, {
		enumerable: true, // 可枚举
        configurable: false, // 不能再define
		get: function() {
			if (Dep.target) {
				dep.depend();
			}
			return val;
		},
		set: function(value) {
			val = value;
			childObj = observer(value);
			dep.notify();
		}
	})
}