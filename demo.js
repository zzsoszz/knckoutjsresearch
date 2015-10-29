var rword = /[^, ]+/g //切割字符串为一个个小块，以空格或豆号分开它们，结合replace实现字符串的forEach
var serialize = Object.prototype.toString
var $={};

$.oneObject=function(array, val) {
    if (typeof array === "string") {
        array = array.match(rword) || []
    }
    var result = {},
            value = val !== void 0 ? val : 1
    for (var i = 0, n = array.length; i < n; i++) {
        result[array[i]] = value
    }
    return result
};
$.error=function (str, e) {
        throw  (e || Error)(str)
};

var class2type = {}
"Boolean Number String Function Array Date RegExp Object Error".replace(rword, function (name) {
    class2type["[object " + name + "]"] = name.toLowerCase()
})


$.type = function (obj) { //取得目标的类型
    if (obj == null) {
        return String(obj)
    }
    // 早期的webkit内核浏览器实现了已废弃的ecma262v4标准，可以将正则字面量当作函数使用，因此typeof在判定正则时会返回function
    return typeof obj === "object" || typeof obj === "function" ? class2type[serialize.call(obj)] || "object" :  typeof obj
}

$.error = function (obj) { //取得目标的类型
    if (obj == null) {
        return String(obj)
    }
    // 早期的webkit内核浏览器实现了已废弃的ecma262v4标准，可以将正则字面量当作函数使用，因此typeof在判定正则时会返回function
    return typeof obj === "object" || typeof obj === "function" ?
            class2type[serialize.call(obj)] || "object" :
            typeof obj
}

$.log=function log() {
    if (window.console) {
        // http://stackoverflow.com/questions/8785624/how-to-safely-wrap-console-log
        Function.apply.call(console.log, console, arguments)
    }
}




var validValueType = $.oneObject("Null,NaN,Undefined,Boolean,Number,String")
$.dependencyDetection = (function () {
	var _frames = [];
	return {
		begin: function (ret) {
			_frames.push(ret);
		},
		end: function () {
			_frames.pop();
		},
		collect: function (self) {
			if (_frames.length > 0) {
				if(!self.list)
					self.list = [];
				var fn = _frames[_frames.length - 1];
				if ( self.list.indexOf( fn ) >= 0)
					return;
				self.list.push(fn);
			}
		}
	};
})();
$.valueWillMutate = function(observable){
	//observable.list所有订阅者，通过dependencyDetection.collect添加的
	var list = observable.list
	if($.type(list,"Array")){
		for(var i = 0, el; el = list[i++];){
			el();//调用一次订阅者，让其重新计算当前值
		}
	}
}
$.observable = function(value){
	var v = value;//将上一次的传参保存到v中,ret与它构成闭包，每个被监听者都有一个上一次保存的值
	
	//ret就是被监听者
	function ret(neo){
		if(arguments.length){ //setter
			if(!validValueType[$.type(neo)]){
				$.error("arguments must be primitive type!")
				return ret
			}
			if(v !== neo ){//neo是新值，v是原有值
				v = neo;
				$.valueWillMutate(ret);//ret表示我发生改变了,向依赖者发送通知
			}
			return ret;
		}else{                //getter
			$.dependencyDetection.collect(ret);//收集被依赖者
			return v;
		}
	}
	
	value = validValueType[$.type(value)] ? value : void 0;
	ret(arguments[0]);//必须先执行一次
	return ret
}
 
$.computed = function(obj, scope){//为一个惰性函数，会重写自身
	//computed是由多个$.observable组成
	var getter
	if(typeof obj == "function"){
		getter = obj
	}
	var v
	var ret = function(neo){
		$.dependencyDetection.begin(ret);//让其依赖知道自己的存在
		v = getter.call(scope);
		$.dependencyDetection.end();
		return v;
	}
	ret(); //必须先执行一次
	return ret;
}

function MyViewModel() {
	this.firstName = $.observable('Planet');
	this.lastName = $.observable('Earth');
	this.fullName = $.computed(
		function(){
			//定义的时候执行一下这个方法，在被依赖项知道自己的存在，被依赖项firstName通过collect函数收集computed对象
			return this.firstName() + " " + this.lastName();
		},this
	);
	this.card = $.computed(function(){
		return this.fullName() +" 屌丝"
	},this)
	;
}

var a = new MyViewModel();
//============测试代码============
/*
$.log(a.firstName())//Planet
$.log(a.lastName())//Earth
$.log(a.fullName())//Planet Earth 通过上面两个计算出来
a.fullName("xxx yyy");//更新fullName会自动更新firstName与lastName
$.log(a.firstName())//xxx
$.log(a.lastName())//yyy
*/

a.firstName("ooo");//更新firstName会自动更新fullName
$.log(a.fullName())//ooo yyy
//$.log(a.card())//ooo yyy 屌丝