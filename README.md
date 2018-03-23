# vue-imitate

> 深入解析vue 1实现原理，并实现vue双向数据绑定模型


下面我们重头开始框架的实现，我们知道，vue的使用方式如下：

```js

var vm = new Vue({
	el: 'root',
	data() {
		return {
			message: 'this is test',
			number: 5,
			number1: 1,
			number2: 2,
			showNode: false
		}
	},
	methods: {
		add() {
			this.number1 += 1;
			this.number += 1;
		},
		show() {
			this.showNode = !this.showNode;
		}
	}
})

```

由此可见，vue为一个构造函数，并且调用时传入一个对象参数，所以主函数可以如下，源码可见[这里](https://github.com/pf12345/vue-imitate/blob/master/src/init.js)；并对参数进行对应的初始化处理：

```
// init.js 
export default function vueImitate(options) {
	this.options = options || {}; 
	this.selector = options.el ? ('#' + options.el) : 'body'; // 根节点selector
	this.data = typeof options.data === 'function' ? options.data() : options.data; // 保存传入的data
	this.el = document.querySelectorAll(this.selector)[0]; // 保存根节点

	this._directives = [];
}

```

此时可以使用`new vueImitate(options)`的方式进行调用，首先，我们需要界面上展示正确的数据，也就是将下面页面进行处理，使其可以正常访问；

<img alt="demo qcode" src="./static/images/WX20180323-001411.png" />

我们可以参考vue的实现方式，vue将``{{ }}``这种绑定数据的方式转化为指令(directive)，即``v-text``类似；而``v-text``又是如何进行数据绑定的呢？通过下面代码可知，是通过对文本节点重新赋值方式实现，源码见[这里](https://github.com/pf12345/vue-imitate/blob/master/src/directives/text.js)：

```
export default {
  bind () {
    this.attr = this.el.nodeType === 3
      ? 'data'
      : 'textContent'
  },
  update (value) {
    this.el[this.attr] = value
  }
}
```

那么，问题来了，如果需要按照上面的方式实现数据的绑定，我们需要将现在的字符串``{{number}}``转化为一个文本节点，并对它进行指令化处理；这些其实也就是vue compile(编译)、link过程完成的，下面我们就先实现上面功能需求；

## compile

整个编译过程肯定从根元素开始，逐步向子节点延伸处理；

```
export default function Compile(vueImitate) {
	vueImitate.prototype.compile = function() {
		let nodeLink = compileNode(this.el),
			nodeListLink = compileNodeList(this.el.childNodes, this),
			_dirLength = this._directives.length;

		nodeLink && nodeLink(this);
		nodeListLink && nodeListLink(this);

		let newDirectives = this._directives.slice(_dirLength);

		for(let i = 0, _i = newDirectives.length; i < _i; i++) {
			newDirectives[i]._bind();
		}
	}
}

function compileNode(el) {
	let textLink, elementLink;
	// 编译文本节点
	if(el.nodeType === 3 && el.data.trim()) {
		textLink = compileTextNode(el);
	} else if(el.nodeType === 1) {
		elementLink = compileElementNode(el);
	}
	return function(vm) {
		textLink && textLink(vm);
		elementLink && elementLink(vm);
	}
}

function compileNodeList(nodeList, vm) {
	let nodeLinks = [], nodeListLinks = [];
	if(!nodeList || !nodeList.length) {
		return;
	}
	for(let i = 0, _i = nodeList.length; i < _i; i++) {
		let node = nodeList[i];
		nodeLinks.push(compileNode(node)),
		nodeListLinks.push(compileNodeList(node.childNodes, vm));
	}
	return function(vm) {
		if(nodeLinks && nodeLinks.length) {
			for(let i = 0, _i = nodeLinks.length; i < _i; i++) {
				nodeLinks[i] && nodeLinks[i](vm);
			}
		}
		if(nodeListLinks && nodeListLinks.length) {
			for(let i = 0, _i = nodeListLinks.length; i < _i; i++) {
				nodeListLinks[i] && nodeListLinks[i](vm);
			}
		}
	}
}
```

如上代码，首先，我们通过定义一个``Compile``函数，将编译方法放到构造函数``vueImitate.prototype``，而方法中，首先主要使用``compileNode``编译根元素，然后使用``compileNodeList(this.el.childNodes, this)``编译根元素下面的子节点；而在``compileNodeList``中，通过对子节点进行循环，继续编译对应节点及其子节点，如下代码：

```
//  function compileNodeList
for(let i = 0, _i = nodeList.length; i < _i; i++) {
	let node = nodeList[i];
	nodeLinks.push(compileNode(node)),
	nodeListLinks.push(compileNodeList(node.childNodes, vm));
}

```

然后进行递归调用，直到最下层节点：而在对节点进行处理时，主要分为文本节点和元素节点；文本节点主要处理上面说的``{{number}}``的编译，元素节点主要处理节点属性如``v-model``、``v-text``、``v-show``、``v-bind:click``等处理；

```js
function compileTextNode(el) {
	let tokens = parseText(el.wholeText);
	var frag = document.createDocumentFragment();
	for(let i = 0, _i = tokens.length; i < _i; i++) {
		let token = tokens[i], el = document.createTextNode(token.value)
		frag.appendChild(el);
	}

	return function(vm) {
		var fragClone = frag.cloneNode(true);
		var childNodes = Array.prototype.slice.call(fragClone.childNodes), token;
		for(let j = 0, _j = tokens.length; j < _j; j++) {
			if((token = tokens[j]) && token.tag) {
				let	_el = childNodes[j], description = {
					el: _el,
					token: tokens[j],
					def: publicDirectives['text']
				}
				vm._directives.push(new Directive(vm, _el, description))
			}
		}

		// 通过这儿将`THIS IS TEST {{ number }} test` 这种转化为三个textNode
		if(tokens.length) {
			replace(el, fragClone);
		}
	}	
}

function compileElementNode(el) {
	let attrs = getAttrs(el);
	return function(vm) {
		if(attrs && attrs.length) {
			attrs.forEach((attr) => {
				let name = attr.name, description, matched;
				if(bindRE.test(attr.name)) {
					description = {
						el: el,
						def: publicDirectives['bind'],
						name: name.replace(bindRE, ''),
						value: attr.value
					}
				} else if((matched = name.match(dirAttrRE))) {
					description = {
						el: el,
						def: publicDirectives[matched[1]],
						name: matched[1],
						value: attr.value
					}
				}
				if(description) {
					vm._directives.push(new Directive(vm, el, description));

				}
			})
		}
	}
}

```

这里，先主要说明对文本节点的处理，我们上面说过，我们需要对``{{number}}``之类进行处理，我们首先必须将其字符串转化为文本节点，如``this is number1: {{number1}}``这种，我们必须转换为两个文本节点，一个是``this is number1: ``，它不需要进行任何处理；另一个是``{{number1}}``，它需要进行数据绑定，并实现双向绑定；因为只有转化为文本节点，才能使用``v-text``类似功能实现数据的绑定；而如何进行将字符串文本分割为不同的文本节点呢，那么，就只能使用正则方式``let reg = /\{\{(.+?)\}\}/ig;``将``{{ number }}``这种形式数据与普通正常文本分割之后，再分别创建``textNode``，如下：

```
function parseText(str) {
	let reg = /\{\{(.+?)\}\}/ig;
	let matchs = str.match(reg), match, tokens = [], index, lastIndex = 0;

	while (match = reg.exec(str)) {
		index = match.index
	    if (index > lastIndex) {
	      tokens.push({
	        value: str.slice(lastIndex, index)
	      })
	    }
		tokens.push({
			value: match[1],
			html: match[0],
			tag: true
		})
	    lastIndex = index + match[0].length
	}

	return tokens;
}
```

通过上面``parseText``方法，可以将``this is number: {{number}}``转化为如下结果：

<img alt="demo qcode" src="./static/images/WX20180323-093724.png" />

转化为上图结果后，就对返回数组进行循环，分别通过创建文本节点;这儿为了性能优化，先创建文档碎片，将节点放入文档碎片中；

```
// function compileTextNode
// el.wholeText => 'this is number: {{number}}'

let tokens = parseText(el.wholeText);
var frag = document.createDocumentFragment();
for(let i = 0, _i = tokens.length; i < _i; i++) {
	let token = tokens[i], el = document.createTextNode(token.value)
	frag.appendChild(el);
}

```

而在最后编译完成，执行``linker``时，主要做两件事，第一是对需要双向绑定的节点创建``directive``，第二是将整个文本节点进行替换；怎么替换呢？如最开始是一个文本节点``this is number: {{number}}``，经过上面处理之后，在``frag``中其实是两个文本节点``this is number: ``和``{{number}}``；此时就使用``replaceChild``方法使用新的节点替换原始的节点；

```
// compile.js
function compileTextNode(el) {
	let tokens = parseText(el.wholeText);
	var frag = document.createDocumentFragment();
	for(let i = 0, _i = tokens.length; i < _i; i++) {
		let token = tokens[i], el = document.createTextNode(token.value)
		frag.appendChild(el);
	}

	return function(vm) {
		var fragClone = frag.cloneNode(true);
		var childNodes = Array.prototype.slice.call(fragClone.childNodes), token;
		
		// 创建directive
		......

		// 通过这儿将`THIS IS TEST {{ number }} test` 这种转化为三个textNode
		if(tokens.length) {
			replace(el, fragClone);
		}
	}	
}

// util.js
export function replace (target, el) {
  var parent = target.parentNode
  if (parent) {
    parent.replaceChild(el, target)
  }
}
```

替换后结果如下图：

<img alt="demo qcode" src="./static/images/WX20180323-095149.png" />

经过与最开始图比较可以发现，已经将``this is number: {{number}} middle {{number2}}``转化为``this is number: number middle number2``；只是此时，仍然展示的是变量名称，如``number``,``number2``；那么，我们下面应该做的肯定就是需要根据我们初始化时传入的变量的值，将其进行正确的展示；最终结果肯定应该为``this is number: 5 middle 2``；即将``number``替换为``5``、将``number2``替换为``2``;那么，如何实现上述功能呢，我们上面提过，使用指令(directive)的方式；下面，就开始进行指令的处理；

## Directive(指令)

对于每一个指令，肯定是隔离开的，互相不受影响且有自己的一套处理方式；所以，我们就使用对象的方式；一个指令就是一个实例化的对象，彼此之间互不影响；如下代码：

```
export default function Directive(vm, el, description) {
	this.vm = vm;
	this.el = el;
	this.description = description;
	this.expression = description ? description.value : '';
}
```
在创建一个指令时，需要传入三个参数，一个是最开始初始化``var vm = new vueImitate(options)``时实例化的对象；而el是需要初始化指令的当前元素，如``<p v-show="showNode">this is test</p>``，需要创建``v-show``的指令，此时的``el``就是当前的``p``标签；而``description``主要包含指令的描述信息；主要包含如下：
```
// 源码见 './directives/text.js'
var text = {
  bind () {
    this.attr = this.el.nodeType === 3
      ? 'data'
      : 'textContent'
  },
  update (value) {
    this.el[this.attr] = value
  }
}

// 如，'{{number}}'
description = {
	el: el, // 需要创建指令的元素
	def: text, // 对指令的操作方法，包括数据绑定(bind)、数据更新(update)，见上面 text
	name: 'text', // 指令名称
	value: 'number' // 指令对应数据的key
}
```

通过```new Directive(vm, el, description)```就创建了一个指令，并初始化一些数据；下面就先通过指令对界面进行数据渲染；所有逻辑就放到了``_bind``方法中，如下：

```
// directive.js
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

// util.js
export function extend(to, from) {
	Object.keys(from).forEach((key) => {
		to[key] = from[key];
	})
	return to;
}
```
方法首先将传入的指令操作方法合并到``this``上，方便调用，主要包括上面说的``bind``、``update``等方法；其主要根据指令不同，功能不同而不同定义；所有对应均在``./directives/*``文件夹下面，包括文本渲染text.js、事件添加bind.js、v-model对应model.js、v-show对应show.js等；通过合并以后，就执行``this.bind()``方法进行数据初始化绑定；但是，目前为止，当去看界面时，仍然没有将``number``转化为``5``；为什么呢？通过查看代码：
```
export default {
  bind () {
    this.attr = this.el.nodeType === 3
      ? 'data'
      : 'textContent'
  },

  update (value) {
    this.el[this.attr] = value
  }
}
```
``bind``并没有改变节点展示值，而是通过``update``; 所以，如果调用``this.update(123)``，可发现有如下结果：

<img alt="demo qcode" src="./static/images/WX20180323-103806.png" />

其实我们并不是直接固定数值，而是根据初始化时传入的值动态渲染；但是目前为止，至少已经完成了界面数据的渲染，只是数据不对而已；
然后，我们回头看下编译过程，我们需要在编译过程去实例化指令(directive)，并调用其``_bind``方法，对指令进行初始化处理；

```
// 见compile.js 'function compileTextNode'
let	_el = childNodes[j], description = {
	el: _el,
	name: 'text',
	value: tokens[j].value,
	def: publicDirectives['text']
}
vm._directives.push(new Directive(vm, _el, description));

// 见compile.js 'function compile'
let newDirectives = this._directives.slice(_dirLength);
for(let i = 0, _i = newDirectives.length; i < _i; i++) {
	newDirectives[i]._bind();
}

```

上面说了，目前还没有根据传入的数据进行绑定，下面，就来对数据进行处理；

## 数据处理

数据处理包括以下几个方面：

 - 数据双向绑定
 - 数据变化后，需要通知到ui界面，并自动变化
 - 对于输入框，使用v-model时，需要将输入内容反应到对应数据

#### 数据双向绑定

需要实现双向绑定，就是在数据变化后能够自动的将对应界面进行更新；那么，如何监控数据的变化呢？目前有几种方式，一种是angular的脏检查方式，就是对用户所以操作、会导致数据变化的行为进行拦截，如``ng-click``、``$http``、``$timeout``等；当用户进行请求数据、点击等时，会对所有的数据进行检查，如果数据变化了，就会触发对应的处理；而另一种是vue的实现方式，使用``Object.definProperty()``方法，对数据添加``setter``和``getter``；当对数据进行赋值时，会自动触发``setter``；就可以监控数据的变化；主要处理如下, 源码见[这里](https://github.com/pf12345/vue-imitate/blob/master/src/Observer.js)：

```
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
```

``Observer``是一个构造函数，主要对传入的数据进行``Object.defineProperty``绑定；可以监控到数据的变化；而在每一个Observer中，会初始化一个``Dep``的称为‘调度管理器’的对象，它主要负责保存界面更新的操作和操作的触发；

#### 界面更新

在通过上面``Observer``实现数据监控之后，如何通知界面更新呢？这里使用了‘发布／订阅模式’；如果需要对此模式进行更深入理解，可查看[此链接](https://www.zhihu.com/question/23486749)；而每个数据key都会维护了一个独立的调度中心``Dep``;通过在上面``defineProperty``时创建；而``Dep``主要保存数据更新后的处理任务及对任务的处理，代码也非常简单，就是使用``subs``保存所有任务，使用``addSub``添加任务，使用``notify``处理任务，``depend``作用会在下面``watcher``中进行说明：

```
// Dep.js

let uid = 0;
// 调度中心
export default function Dep() {
	this.id = uid++;
	this.subs = []; //订阅者数组
	this.target = null; // 有何用处？
}

// 添加任务
Dep.prototype.addSub = function(sub) {
	this.subs.push(sub);
}

// 处理任务
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
```

那么，处理任务来源哪儿呢？vue中又维护了一个``watcher``的对象，主要是对任务的初始化和收集处理；也就是一个``watcher``就是一个任务；而整个``watcher``代码如下, 线上源码见[这里](https://github.com/pf12345/vue-imitate/blob/master/src/watcher.js)：
```
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
```

在初始化``watcher``时，需要传入vm(整个项目初始化时实例化的vueImitate对象，因为需要用到里面的对应数据)、expression(任务对应的数据的key，如上面的‘number’)、cb(一个当数据变化后，界面如何更新的函数，也就是上面directive里面的update方法)；我们需要实现功能有，第一是每个任务有个``update``方法，主要用于在数据变化时，进行调用，即：

```
// 处理任务
Dep.prototype.notify = function() {
	this.subs.forEach((sub) => {
		if(sub && sub.update && typeof sub.update === 'function') {
			sub.update();
		}
	})
}
```

第二个是在初始化``watcher``时，需要将实例化的watcher(任务)放入调度中心``dep``的``subs``中；如何实现呢？这里，使用了一些黑科技，流程如下，这儿我们以``expression``为'number'为例：

1、在初始化watcher时，会去初始化一个获取数据的方法``this.getter``就是，能够通过传入的``expression``取出对应的值；如通过``number``取出对应的初始化时的值``5``;

2、调用``this.value = this.get();``方法，方法中会去数据源中取值，并将此时的watcher放入``Dep.target``中备用，并返回取到的值；
```
// watcher.js
_prototype.get = function() {
	Dep.target = this;
	var value = this.getter && this.getter.call(this.vm, this.vm);
	Dep.target = null;
	return value;
}
```

3、因为我们在上面``Observer``已经对数据进行了``Object.defineProperty``绑定，所以，当上面2步取值时，会触发对应的``getter``，如下, 触发get函数之后，因为上面2已经初始化``Dep.target = this;``了，所以会执行``dep.depend();``，就是上面说的``depend``函数了：
```
// Observer.js
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

```

3、触发``dep.depend();``之后，如下代码，会执行``Dep.target.addDep(this);``, 此时的``this``就是上面实例化的``dep``, ``Dep.target``则对应的是刚刚1步中实例化的``watcher``，即执行``watcher.addDep(dep)``;

```
// Dep.js
Dep.prototype.depend = function() {
	Dep.target.addDep(this);
}
```

4、触发``watcher.addDep(dep)``，如下代码，如果目前还没此dep；就执行``dep.addSub(this);``,此时的``this``就是指代当前``watcher``，也就是1步时实例化的watcher；此时dep是步骤3中实例化的``dep``; 即是，``dep.addSub(watcher);``
```
// watcher.js
_prototype.addDep = function(dep) {
	// console.log(dep)
	if (!this.depIds.hasOwnProperty(dep.id)) {
		dep.addSub(this);
		this.depIds[dep.id] = dep;
	}
}
```

5、最后执行``dep.addSub(watcher);``，如下代码，到这儿，就将初始化的``watcher``添加到了调度中心的数组中；
```
// Dep.js
Dep.prototype.addSub = function(sub) {
	this.subs.push(sub);
}
```


## Demo运行

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:8080
npm run dev

```
