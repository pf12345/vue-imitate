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

首先，我们通过定义一个``Compile``函数，将编译方法放到构造函数``vueImitate.prototype``，而方法中，首先主要使用``compileNode``编译根元素，然后使用``compileNodeList(this.el.childNodes, this)``编译根元素下面的子节点；而在``compileNodeList``中，通过对子节点进行循环，继续编译对应节点及其子节点，如下，然后进行递归调用，直到最下层节点：而在对节点进行处理时，主要分为文本节点和元素节点；文本节点主要处理上面说的``{{number}}``的编译，元素节点主要处理节点属性如``v-model``、``v-text``、``v-show``、``v-bind:click``等处理；

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

这里，先主要说明对文本节点的处理，我们上面说过，我们需要对``{{number}}``之类进行处理，我们首先必须将其字符串转化为文本节点，如``this is number1: {{number1}}``这种，我们必须转换为两个文本节点，一个是``this is number1: ``，它不需要进行任何处理；另一个是``{{number1}}``，它需要进行数据绑定，并实现双向绑定；

```
for(let i = 0, _i = nodeList.length; i < _i; i++) {
	let node = nodeList[i];
	nodeLinks.push(compileNode(node)),
	nodeListLinks.push(compileNodeList(node.childNodes, vm));
}
```

## Demo运行

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:8080
npm run dev

```
