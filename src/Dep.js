let uid = 0;
// 调度中心
export default function Dep() {
	this.id = uid++;
	this.subs = []; //订阅者数组
	this.target = null; // 有何用处？
}

// 添加订阅者
Dep.prototype.addSub = function(sub) {
	this.subs.push(sub);
}

Dep.prototype.notify = function() {
	this.subs.forEach((sub) => {
		if(sub && sub.update && typeof sub.update === 'function') {
			sub.update();
		}
	})
}

Dep.prototype.depend = function() {
	Dep.target.addDep(this);
}