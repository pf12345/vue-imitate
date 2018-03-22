import vueImitate from './init.js';
import Compile from './compile.js';

Compile(vueImitate);

let vm = new vueImitate({
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

